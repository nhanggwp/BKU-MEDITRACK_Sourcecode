# routes/prescription_routes.py
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import List, Union, Optional, Dict, Any
from services.supabase_service import SupabaseService

router = APIRouter()
sb = SupabaseService()

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
                    'disease_name': pres_meta.get('disease_name') if isinstance(pres_meta, dict) else None,
                    'notes': pres_meta.get('notes') if isinstance(pres_meta, dict) else None,
                    'prescription_date': pres_meta.get('prescription_date') if isinstance(pres_meta, dict) else None,
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
                    "start_date": med.get("start_date"),
                    "end_date": med.get("end_date"),
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

        # If prescription_id exists, attach it to rows before upserting and
        # propagate prescription-level disease_name into each row so we can
        # easily display grouped results on frontend.
        on_conflict = "user_id,medication_name"
        if prescription_id:
            for r in dedup:
                r["prescription_id"] = prescription_id
                # no longer store disease_name on prescription_items; it's stored on prescriptions
            on_conflict = "prescription_id,medication_name"
        else:
            # Ensure we always create a prescription row for grouping.
            try:
                new_pres = {
                    'user_id': user['id'],
                    'notes': (pres_meta.get('notes') if isinstance(pres_meta, dict) else None) or 'Saved via app',
                    'disease_name': (pres_meta.get('disease_name') if isinstance(pres_meta, dict) else None) or None,
                }
                ins_pres = sb.client.table('prescriptions').insert(new_pres).execute()
                if ins_pres and ins_pres.data:
                    prescription_id = ins_pres.data[0].get('id')

                    # Reassign any orphan prescription_items for this user to this new prescription
                    try:
                        sb.client.table('prescription_items').update({'prescription_id': prescription_id}).eq('user_id', user['id']).is_('prescription_id', None).execute()
                    except Exception:
                        # ignore update errors, proceed to attach prescription_id to new rows
                        pass

                    for r in dedup:
                        r['prescription_id'] = prescription_id
                on_conflict = 'prescription_id,medication_name'
            except Exception:
                # fallback: leave rows without prescription_id
                on_conflict = 'user_id,medication_name'

        resp = (
            sb.client.table("prescription_items")
            .upsert(dedup, on_conflict=on_conflict)
            .execute()
        )
        print("📦 Supabase upsert resp:", resp)
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
