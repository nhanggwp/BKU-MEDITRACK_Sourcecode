# routes/prescription_routes.py
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import List, Union, Optional, Dict, Any
from datetime import datetime
import re
from services.supabase_service import SupabaseService

router = APIRouter()
sb = SupabaseService()

def convert_date_format(date_str: str) -> Optional[str]:
    """
    Convert various date formats to ISO format (YYYY-MM-DD) for PostgreSQL
    Supports: dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd, etc.
    """
    if not date_str or not date_str.strip():
        return None
    
    date_str = date_str.strip()
    
    # Already in ISO format (YYYY-MM-DD)
    if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
        return date_str
    
    # dd/mm/yyyy or dd-mm-yyyy format
    if re.match(r'^\d{1,2}[/-]\d{1,2}[/-]\d{4}$', date_str):
        try:
            # Try dd/mm/yyyy first
            parts = re.split(r'[/-]', date_str)
            day, month, year = parts[0], parts[1], parts[2]
            # Validate and convert
            dt = datetime(int(year), int(month), int(day))
            return dt.strftime('%Y-%m-%d')
        except (ValueError, IndexError):
            pass
    
    # mm/dd/yyyy format (American)
    if re.match(r'^\d{1,2}[/-]\d{1,2}[/-]\d{4}$', date_str):
        try:
            parts = re.split(r'[/-]', date_str)
            month, day, year = parts[0], parts[1], parts[2]
            dt = datetime(int(year), int(month), int(day))
            return dt.strftime('%Y-%m-%d')
        except (ValueError, IndexError):
            pass
    
    # yyyy/mm/dd format
    if re.match(r'^\d{4}[/-]\d{1,2}[/-]\d{1,2}$', date_str):
        try:
            parts = re.split(r'[/-]', date_str)
            year, month, day = parts[0], parts[1], parts[2]
            dt = datetime(int(year), int(month), int(day))
            return dt.strftime('%Y-%m-%d')
        except (ValueError, IndexError):
            pass
    
    # If all parsing fails, return None
    print(f"⚠️ Could not parse date format: {date_str}")
    return None

class RichMed(BaseModel):
    medication_name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    notes: Optional[str] = None

class SaveMedsBody(BaseModel):
    # support either list of strings (legacy) or list of objects
    medications: List[Union[str, RichMed]]
    # optional disease name detected from OCR or entered by user
    disease_name: Optional[str] = None
    # optional prescription-level metadata to create/link a prescription record
    prescription: Optional[Dict[str, Any]] = None

@router.post("/prescriptions/save")
async def save_prescription_items(body: SaveMedsBody, request: Request):
    print("✅ Route save_prescription_items CALLED")
    user = getattr(request.state, "user", None)
    token = getattr(request.state, "token", None)
    if not user or not user.get("id") or not token:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # 🔑 RẤT QUAN TRỌNG: set token cho đúng instance `sb` dùng trong route này
    sb.set_auth_token(token)

    try:
        # If prescription metadata is provided, create or find the prescriptions row
        prescription_id = None
        pres_meta = getattr(body, 'prescription', None) or None
        if pres_meta:
            # prefer ocr_upload_id if provided
            ocr_id = pres_meta.get('ocr_upload_id') if isinstance(pres_meta, dict) else None
            if ocr_id:
                existing = sb.client.table('prescriptions').select('id').eq('ocr_upload_id', ocr_id).limit(1).execute()
                if existing and existing.data:
                    prescription_id = existing.data[0].get('id')
            if not prescription_id:
                new_pres = {
                    'user_id': user['id'],
                    'ocr_upload_id': pres_meta.get('ocr_upload_id') if isinstance(pres_meta, dict) else None,
                    'disease_name': (pres_meta.get('disease_name') if isinstance(pres_meta, dict) else None) or body.disease_name,
                    'notes': pres_meta.get('notes') if isinstance(pres_meta, dict) else None,
                    'prescription_date': convert_date_format(pres_meta.get('prescription_date')) if isinstance(pres_meta, dict) else None,
                }
                ins = sb.client.table('prescriptions').insert(new_pres).execute()
                if ins and ins.data:
                    prescription_id = ins.data[0].get('id')
        rows = []
        # Normalize incoming medications to full rows
        for m in body.medications:
            # support string names, dicts, or pydantic models (RichMed)
            if isinstance(m, str):
                name = (m or "").strip()
                if not name:
                    continue
                rows.append({"user_id": user["id"], "medication_name": name})
            else:
                # m may be a dict or a pydantic BaseModel
                if isinstance(m, dict):
                    med = m
                elif hasattr(m, "dict"):
                    try:
                        med = m.dict()
                    except Exception:
                        med = dict(m)
                else:
                    try:
                        med = dict(m)
                    except Exception:
                        # fallback: stringify
                        med = {"medication_name": str(m)}

                name = (med.get("medication_name") or "").strip()
                if not name:
                    continue
                row = {
                    "user_id": user["id"],
                    "medication_name": name,
                    "dosage": med.get("dosage"),
                    "frequency": med.get("frequency"),
                    "duration": med.get("duration"),
                    "start_date": convert_date_format(med.get("start_date")),
                    "end_date": convert_date_format(med.get("end_date")),
                    "notes": med.get("notes"),
                }
                rows.append(row)

        # Deduplicate by medication_name keeping the first occurrence
        seen = set()
        dedup = []
        for r in rows:
            key = r.get("medication_name")
            if key in seen:
                continue
            seen.add(key)
            dedup.append(r)

        print("📝 Rows to upsert (rich):", dedup)

        # nothing to do
        if not dedup:
            return {"ok": True, "inserted": 0, "data": []}

        # Always ensure we have a prescription_id for proper grouping and conflict resolution
        if not prescription_id:
            # Create a prescription row for grouping since we don't allow orphan medications anymore
            try:
                new_pres = {
                    'user_id': user['id'],
                    'notes': (pres_meta.get('notes') if isinstance(pres_meta, dict) else None) or 'Saved via app',
                    'disease_name': (pres_meta.get('disease_name') if isinstance(pres_meta, dict) else None) or body.disease_name,
                    'prescription_date': convert_date_format(pres_meta.get('prescription_date')) if isinstance(pres_meta, dict) else None,
                }
                ins_pres = sb.client.table('prescriptions').insert(new_pres).execute()
                if ins_pres and ins_pres.data:
                    prescription_id = ins_pres.data[0].get('id')
                    print(f"📋 Created new prescription with ID: {prescription_id}")
                else:
                    raise Exception("Failed to create prescription")
            except Exception as e:
                print(f"❌ Failed to create prescription: {e}")
                raise HTTPException(status_code=500, detail="Failed to create prescription")

        # Attach prescription_id to all medication rows
        for r in dedup:
            r["prescription_id"] = prescription_id

        # Since we now guarantee prescription_id exists, we can use manual conflict resolution
        # instead of relying on upsert's on_conflict which might not work with partial indexes
        print(f"💾 Saving {len(dedup)} medications to prescription {prescription_id}")
        
        # Handle conflicts manually by checking existing medications first
        try:
            existing_meds = sb.client.table("prescription_items").select("medication_name").eq("prescription_id", prescription_id).execute()
            existing_med_names = {med.get("medication_name") for med in (existing_meds.data or [])}
            
            # Filter out medications that already exist in this prescription
            new_meds = [med for med in dedup if med.get("medication_name") not in existing_med_names]
            
            if new_meds:
                # Insert only new medications
                resp = sb.client.table("prescription_items").insert(new_meds).execute()
                print(f"📦 Inserted {len(new_meds)} new medications")
            else:
                print("📦 No new medications to insert (all already exist)")
                resp = type('MockResponse', (), {'data': []})()  # Mock response for consistency
                
        except Exception as insert_error:
            print(f"❌ Manual insert failed: {insert_error}")
            # Fallback: try upsert without on_conflict (will fail if true duplicates exist)
            resp = sb.client.table("prescription_items").insert(dedup).execute()

        print("📦 Supabase response:", resp)
        return {"ok": True, "inserted": len(resp.data or []), "data": resp.data or []}
    except Exception as e:
        print("❌ save_prescription_items error:", e)
        raise HTTPException(status_code=500, detail="Failed to save prescriptions")

@router.get("/prescriptions/list")
async def list_prescriptions(
    request: Request,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    user = getattr(request.state, "user", None)
    token = getattr(request.state, "token", None)
    if not user or not user.get("id") or not token:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # 🔑 Set token cho instance `sb` trong route này
    sb.set_auth_token(token)

    try:
        # Return prescriptions for the user along with their prescription_items
        print("🔑 list_prescriptions (by prescriptions) user_id =", user["id"])
        pres_resp = (
            sb.client.table("prescriptions")
            .select(
                "id, disease_name, prescription_date, created_at, prescription_items(id, medication_name, dosage, frequency, duration, start_date, end_date, notes)"
            )
            .eq("user_id", user["id"]) 
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )

        results = []
        for p in (pres_resp.data or []):
            meds = []
            for m in (p.get("prescription_items") or []):
                meds.append({
                    "id": m.get("id"),
                    "name": m.get("medication_name"),
                    "dosage": m.get("dosage"),
                    "frequency": m.get("frequency"),
                    "duration": m.get("duration"),
                    "start_date": m.get("start_date"),
                    "end_date": m.get("end_date"),
                    "notes": m.get("notes"),
                })

            results.append({
                "prescription_id": p.get("id"),
                "disease_name": p.get("disease_name"),
                "prescription_date": p.get("prescription_date"),
                "created_at": p.get("created_at"),
                "medications": meds,
            })

        # Also include any prescription_items that are not linked to a prescriptions row
        try:
            orphan_resp = (
                sb.client.table("prescription_items")
                .select("id, medication_name, dosage, frequency, duration, start_date, end_date, notes, created_at")
                .eq("user_id", user["id"]) 
                .is_("prescription_id", None)
                .order("created_at", desc=True)
                .execute()
            )
            if orphan_resp and orphan_resp.data:
                orphan_meds = []
                for m in orphan_resp.data:
                    orphan_meds.append({
                        "id": m.get("id"),
                        "name": m.get("medication_name"),
                        "dosage": m.get("dosage"),
                        "frequency": m.get("frequency"),
                        "duration": m.get("duration"),
                        "start_date": m.get("start_date"),
                        "end_date": m.get("end_date"),
                        "notes": m.get("notes"),
                    })

                results.insert(0, {
                    "prescription_id": None,
                    "disease_name": None,
                    "prescription_date": None,
                    "created_at": orphan_resp.data[0].get("created_at"),
                    "medications": orphan_meds,
                })
        except Exception:
            # ignore orphan fetch errors and return whatever we have
            pass

        return {"prescriptions": results, "count": len(results), "offset": offset, "limit": limit}
    except Exception as e:
        print("❌ list_prescriptions error:", e)
        raise HTTPException(status_code=500, detail="Failed to list prescriptions")
