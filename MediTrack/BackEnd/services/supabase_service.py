from supabase import create_client, Client
from typing import Optional, Dict, Any, List
import os
from config.settings import Settings

class SupabaseService:
    def __init__(self):
        self.settings = Settings()
        self.client: Client = create_client(
            self.settings.supabase_url,
            self.settings.supabase_key
        )
        self.admin_client: Client = create_client(
            self.settings.supabase_url,
            self.settings.supabase_service_key
        )
        self.auth_token = None
    
    def set_auth_token(self, token: str):
        """Set authentication token for the client"""
        # Store the token
        self.auth_token = token
        # Set the auth token in the client's auth context
        try:
            # Method 1: Set session directly
            self.client.auth.set_session(access_token=token, refresh_token="")
        except:
            try:
                # Method 2: Set headers manually
                self.client.options.headers["Authorization"] = f"Bearer {token}"
            except:
                # Method 3: Use postgrest auth
                self.client.postgrest.auth(token)
    
    async def health_check(self) -> bool:
        """Check if Supabase connection is healthy"""
        try:
            response = self.client.table('users').select('id').limit(1).execute()
            return True
        except Exception:
            return False
    
    # User Management
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        try:
            response = self.client.table('users').select('*').eq('id', user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            raise Exception(f"Error fetching user: {str(e)}")
    
    async def create_user_profile(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create user profile"""
        try:
            # Use admin client for creating user profiles to bypass RLS
            response = self.admin_client.table('users').insert(user_data).execute()
            return response.data[0]
        except Exception as e:
            raise Exception(f"Error creating user profile: {str(e)}")
    
    async def update_user_profile(self, user_id: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user profile"""
        try:
            response = self.client.table('users').update(user_data).eq('id', user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            raise Exception(f"Error updating user profile: {str(e)}")
    
    # Medical History
    async def get_medical_history(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's medical history"""
        try:
            response = self.client.table('medical_histories').select('''
                *,
                conditions (name, description, severity)
            ''').eq('user_id', user_id).eq('is_active', True).execute()
            return response.data
        except Exception as e:
            raise Exception(f"Error fetching medical history: {str(e)}")
    
    async def add_medical_condition(self, user_id: str, condition_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add medical condition to user's history"""
        try:
            condition_data['user_id'] = user_id
            response = self.client.table('medical_histories').insert(condition_data).execute()
            return response.data[0]
        except Exception as e:
            raise Exception(f"Error adding medical condition: {str(e)}")
    
    # Allergies
    async def get_allergies(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's allergies"""
        try:
            response = self.client.table('allergies').select('*').eq('user_id', user_id).execute()
            return response.data
        except Exception as e:
            raise Exception(f"Error fetching allergies: {str(e)}")
    
    async def add_allergy(self, user_id: str, allergy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add allergy"""
        try:
            allergy_data['user_id'] = user_id
            response = self.client.table('allergies').insert(allergy_data).execute()
            return response.data[0]
        except Exception as e:
            raise Exception(f"Error adding allergy: {str(e)}")
    
    # OCR and Prescriptions
    async def save_ocr_upload(self, user_id: str, ocr_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save OCR upload data"""
        try:
            ocr_data['user_id'] = user_id
            response = self.client.table('ocr_uploads').insert(ocr_data).execute()
            return response.data[0]
        except Exception as e:
            raise Exception(f"Error saving OCR upload: {str(e)}")
    
    async def get_ocr_upload(self, upload_id: str) -> Optional[Dict[str, Any]]:
        """Get OCR upload by ID"""
        try:
            response = self.client.table('ocr_uploads').select('*').eq('id', upload_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            raise Exception(f"Error fetching OCR upload: {str(e)}")
    
    async def get_ocr_uploads(self, user_id: str, limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
        """Get user's OCR uploads"""
        try:
            response = self.client.table('ocr_uploads').select('*').eq('user_id', user_id).order('created_at', desc=True).range(offset, offset + limit - 1).execute()
            return response.data
        except Exception as e:
            raise Exception(f"Error fetching OCR uploads: {str(e)}")
    
    async def get_ocr_upload_with_medicines(self, upload_id: str) -> Optional[Dict[str, Any]]:
        """Get OCR upload with extracted medicines"""
        try:
            response = self.client.table('ocr_uploads').select('''
                *,
                extracted_medicines (*)
            ''').eq('id', upload_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            raise Exception(f"Error fetching OCR upload with medicines: {str(e)}")
    
    async def update_ocr_upload_status(self, upload_id: str, processed: bool) -> Dict[str, Any]:
        """Update OCR upload processed status"""
        try:
            response = self.client.table('ocr_uploads').update({'processed': processed}).eq('id', upload_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            raise Exception(f"Error updating OCR upload status: {str(e)}")
    
    async def save_extracted_medicines(self, ocr_upload_id: str, medicines: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Save extracted medicines from OCR"""
        try:
            # Add ocr_upload_id to each medicine
            for medicine in medicines:
                medicine['ocr_upload_id'] = ocr_upload_id
            
            response = self.client.table('extracted_medicines').insert(medicines).execute()
            return response.data
        except Exception as e:
            raise Exception(f"Error saving extracted medicines: {str(e)}")
    
    async def update_extracted_medicines(self, upload_id: str, medicines: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Update extracted medicines for an upload"""
        try:
            # First delete existing medicines for this upload
            self.client.table('extracted_medicines').delete().eq('ocr_upload_id', upload_id).execute()
            
            # Then insert the updated medicines
            for medicine in medicines:
                medicine['ocr_upload_id'] = upload_id
            
            response = self.client.table('extracted_medicines').insert(medicines).execute()
            return response.data
        except Exception as e:
            raise Exception(f"Error updating extracted medicines: {str(e)}")
    
    async def verify_prescription(self, upload_id: str) -> Dict[str, Any]:
        """Mark prescription as verified"""
        try:
            response = self.client.table('extracted_medicines').update({'verified': True}).eq('ocr_upload_id', upload_id).execute()
            return {"verified": True}
        except Exception as e:
            raise Exception(f"Error verifying prescription: {str(e)}")
    
    async def delete_ocr_upload(self, upload_id: str):
        """Delete OCR upload and associated data"""
        try:
            # Delete extracted medicines first (due to foreign key constraint)
            self.client.table('extracted_medicines').delete().eq('ocr_upload_id', upload_id).execute()
            # Delete the upload
            self.client.table('ocr_uploads').delete().eq('id', upload_id).execute()
        except Exception as e:
            raise Exception(f"Error deleting OCR upload: {str(e)}")
    
    # Drug Interaction methods
    async def get_interaction_history(self, user_id: str, limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
        """Get user's interaction check history"""
        try:
            response = self.client.table('interaction_logs').select('*').eq('user_id', user_id).order('checked_at', desc=True).range(offset, offset + limit - 1).execute()
            return response.data
        except Exception as e:
            raise Exception(f"Error fetching interaction history: {str(e)}")
    
    # AI Explanation methods
    async def get_cached_ai_explanation(self, user_id: str, medication_list: List[str], risk_factors: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Get cached AI explanation"""
        try:
            # Simple cache lookup based on medication list
            medications_str = ','.join(sorted(medication_list))
            response = self.client.table('ai_explanations').select('*').eq('user_id', user_id).contains('medication_list', medication_list).limit(1).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            return None
    
    async def get_ai_explanation_history(self, user_id: str, limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
        """Get user's AI explanation history"""
        try:
            response = self.client.table('ai_explanations').select('*').eq('user_id', user_id).order('created_at', desc=True).range(offset, offset + limit - 1).execute()
            return response.data
        except Exception as e:
            raise Exception(f"Error fetching AI explanation history: {str(e)}")
    
    async def get_ai_explanation_by_id(self, explanation_id: str) -> Optional[Dict[str, Any]]:
        """Get AI explanation by ID"""
        try:
            response = self.client.table('ai_explanations').select('*').eq('id', explanation_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            raise Exception(f"Error fetching AI explanation: {str(e)}")
    
    async def save_ai_explanation(self, user_id: str, explanation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save AI explanation to database"""
        try:
            explanation_data['user_id'] = user_id
            
            # Ensure tokens_used is an integer
            if 'tokens_used' in explanation_data:
                explanation_data['tokens_used'] = int(float(explanation_data['tokens_used']))
            
            response = self.admin_client.table('ai_explanations').insert(explanation_data).execute()
            return response.data[0]
        except Exception as e:
            raise Exception(f"Error saving AI explanation: {str(e)}")
    
    async def delete_ai_explanation(self, explanation_id: str):
        """Delete AI explanation"""
        try:
            self.client.table('ai_explanations').delete().eq('id', explanation_id).execute()
        except Exception as e:
            raise Exception(f"Error deleting AI explanation: {str(e)}")
    
    # QR Token methods
    async def create_qr_token(self, user_id: str, token_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create QR token"""
        try:
            token_data['user_id'] = user_id
            # Use admin client to bypass RLS for QR token creation
            response = self.client.table('qr_tokens').insert(token_data).execute()
            return response.data[0]
        except Exception as e:
            raise Exception(f"Error creating QR token: {str(e)}")
    
    async def get_qr_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Get QR token by token string"""
        try:
            response = self.client.table('qr_tokens').select('*').eq('token', token).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            raise Exception(f"Error fetching QR token: {str(e)}")
    
    async def get_qr_token_by_id(self, token_id: str) -> Optional[Dict[str, Any]]:
        """Get QR token by ID"""
        try:
            response = self.client.table('qr_tokens').select('*').eq('id', token_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            raise Exception(f"Error fetching QR token: {str(e)}")
    
    async def get_user_qr_tokens(self, user_id: str, active_only: bool = True) -> List[Dict[str, Any]]:
        """Get user's QR tokens"""
        try:
            query = self.client.table('qr_tokens').select('*').eq('user_id', user_id)
            if active_only:
                from datetime import datetime
                query = query.gte('expires_at', datetime.now().isoformat())
            
            response = query.order('created_at', desc=True).execute()
            return response.data
        except Exception as e:
            raise Exception(f"Error fetching user QR tokens: {str(e)}")
    
    async def delete_qr_token(self, token_id: str):
        """Delete QR token"""
        try:
            self.client.table('qr_tokens').delete().eq('id', token_id).execute()
        except Exception as e:
            raise Exception(f"Error deleting QR token: {str(e)}")
    
    async def log_qr_access(self, qr_token_id: str, access_data: Dict[str, Any]):
        """Log QR access"""
        try:
            access_data['qr_token_id'] = qr_token_id
            self.client.table('qr_access_logs').insert(access_data).execute()
        except Exception as e:
            raise Exception(f"Error logging QR access: {str(e)}")
    
    async def increment_qr_usage(self, qr_token_id: str):
        """Increment QR token usage count"""
        try:
            # Get current usage
            token = await self.get_qr_token_by_id(qr_token_id)
            if token:
                new_count = token.get('current_uses', 0) + 1
                self.client.table('qr_tokens').update({'current_uses': new_count}).eq('id', qr_token_id).execute()
        except Exception as e:
            raise Exception(f"Error incrementing QR usage: {str(e)}")
    
    async def get_qr_access_logs(self, qr_token_id: str) -> List[Dict[str, Any]]:
        """Get QR access logs"""
        try:
            response = self.client.table('qr_access_logs').select('*').eq('qr_token_id', qr_token_id).order('accessed_at', desc=True).execute()
            return response.data
        except Exception as e:
            raise Exception(f"Error fetching QR access logs: {str(e)}")
    
    # Medication Schedule methods
    async def create_medication_schedule(self, user_id: str, schedule_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new medication schedule"""
        try:
            schedule_data['user_id'] = user_id
            response = self.client.table('medication_schedules').insert(schedule_data).execute()
            return response.data[0]
        except Exception as e:
            raise Exception(f"Error creating medication schedule: {str(e)}")
    
    async def get_medication_schedules(self, user_id: str, active_only: bool = False) -> List[Dict[str, Any]]:
        """Get user's medication schedules"""
        try:
            query = self.client.table('medication_schedules').select('*').eq('user_id', user_id)
            if active_only:
                query = query.eq('is_active', True)
            
            response = query.order('created_at', desc=True).execute()
            return response.data
        except Exception as e:
            raise Exception(f"Error fetching medication schedules: {str(e)}")

    async def get_user_saved_medications(self, user_id: str) -> List[str]:
        """Return a deduplicated list of medication names the user has saved.

        This aggregates medication names from medication_schedules (active schedules)
        and extracted_medicines (from OCR uploads).
        """
        try:
            meds = []

            # Medication schedules (active)
            try:
                schedules = self.client.table('medication_schedules').select('medication_name').eq('user_id', user_id).eq('is_active', True).execute()
                if schedules and schedules.data:
                    meds += [s.get('medication_name') for s in schedules.data if s.get('medication_name')]
            except Exception:
                # Non-fatal: continue collecting from other sources
                pass

            # Extracted medicines via OCR uploads
            try:
                # Join extracted_medicines via ocr_uploads owned by user
                # First get recent uploads ids for user
                uploads = self.client.table('ocr_uploads').select('id').eq('user_id', user_id).execute()
                upload_ids = [u.get('id') for u in (uploads.data or []) if u.get('id')]
                if upload_ids:
                    # Fetch extracted_medicines for these upload ids
                    extracted = self.client.table('extracted_medicines').select('extracted_name').in_('ocr_upload_id', upload_ids).execute()
                    if extracted and extracted.data:
                        meds += [e.get('extracted_name') for e in extracted.data if e.get('extracted_name')]
            except Exception:
                pass

            # Normalize and deduplicate while preserving order
            seen = set()
            normalized = []
            for m in meds:
                if not m:
                    continue
                key = m.strip().lower()
                if key not in seen:
                    seen.add(key)
                    normalized.append(m.strip())

            return normalized
        except Exception as e:
            raise Exception(f"Error fetching user saved medications: {str(e)}")
    
    async def get_medication_schedule_by_id(self, schedule_id: str) -> Optional[Dict[str, Any]]:
        """Get medication schedule by ID"""
        try:
            response = self.client.table('medication_schedules').select('*').eq('id', schedule_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            raise Exception(f"Error fetching medication schedule: {str(e)}")
    
    async def update_medication_schedule(self, schedule_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update medication schedule"""
        try:
            response = self.client.table('medication_schedules').update(update_data).eq('id', schedule_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            raise Exception(f"Error updating medication schedule: {str(e)}")
    
    async def delete_medication_schedule(self, schedule_id: str):
        """Delete medication schedule"""
        try:
            self.client.table('medication_schedules').delete().eq('id', schedule_id).execute()
        except Exception as e:
            raise Exception(f"Error deleting medication schedule: {str(e)}")
    
    async def get_upcoming_reminders(self, user_id: str, hours_ahead: int = 24) -> List[Dict[str, Any]]:
        """Get upcoming medication reminders"""
        try:
            from datetime import datetime, timedelta
            now = datetime.now()
            end_time = now + timedelta(hours=hours_ahead)
            
            # This is a simplified version - in practice, you'd need more complex logic
            # to calculate actual reminder times based on schedule
            response = self.client.table('medication_schedules').select('*').eq('user_id', user_id).eq('is_active', True).execute()
            return response.data
        except Exception as e:
            raise Exception(f"Error fetching upcoming reminders: {str(e)}")
    
    async def create_reminder_log(self, log_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create reminder log entry"""
        try:
            response = self.client.table('reminder_logs').insert(log_data).execute()
            return response.data[0]
        except Exception as e:
            raise Exception(f"Error creating reminder log: {str(e)}")
    
    async def get_medication_adherence(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """Get medication adherence statistics"""
        try:
            from datetime import datetime, timedelta
            start_date = datetime.now() - timedelta(days=days)
            
            # Get reminder logs for the period
            response = self.client.table('reminder_logs').select('''
                *,
                medication_schedules!inner(user_id)
            ''').eq('medication_schedules.user_id', user_id).gte('created_at', start_date.isoformat()).execute()
            
            logs = response.data
            total_reminders = len(logs)
            taken_reminders = len([log for log in logs if log.get('status') == 'taken'])
            
            adherence_rate = (taken_reminders / total_reminders * 100) if total_reminders > 0 else 100
            
            return {
                "adherence_rate": adherence_rate,
                "total_reminders": total_reminders,
                "taken_reminders": taken_reminders,
                "missed_reminders": len([log for log in logs if log.get('status') == 'missed']),
                "skipped_reminders": len([log for log in logs if log.get('status') == 'skipped']),
                "period_days": days
            }
        except Exception as e:
            raise Exception(f"Error calculating adherence: {str(e)}")
    
    async def get_reminder_logs(self, user_id: str, schedule_id: Optional[str] = None, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Get reminder logs"""
        try:
            query = self.client.table('reminder_logs').select('''
                *,
                medication_schedules!inner(user_id, medication_name)
            ''').eq('medication_schedules.user_id', user_id)
            
            if schedule_id:
                query = query.eq('schedule_id', schedule_id)
            
            response = query.order('created_at', desc=True).range(offset, offset + limit - 1).execute()
            return response.data
        except Exception as e:
            raise Exception(f"Error fetching reminder logs: {str(e)}")
    
    # Export methods
    async def log_export(self, user_id: str, export_data: Dict[str, Any]) -> Dict[str, Any]:
        """Log data export"""
        try:
            export_data['user_id'] = user_id
            # Use admin client to bypass RLS for export logging
            response = self.admin_client.table('export_logs').insert(export_data).execute()
            return response.data[0]
        except Exception as e:
            raise Exception(f"Error logging export: {str(e)}")
    
    async def get_export_history(self, user_id: str, limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
        """Get export history"""
        try:
            response = self.client.table('export_logs').select('*').eq('user_id', user_id).order('created_at', desc=True).range(offset, offset + limit - 1).execute()
            return response.data
        except Exception as e:
            raise Exception(f"Error fetching export history: {str(e)}")
    
    # Family management methods
    async def get_family_group_with_members(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get family group with members"""
        try:
            # First get the family member record for this user
            member_response = self.client.table('family_members').select('''
                *,
                family_groups (*)
            ''').eq('user_id', user_id).execute()
            
            if not member_response.data:
                return None
            
            family_group = member_response.data[0]['family_groups']
            
            # Get all members of this family group
            members_response = self.client.table('family_members').select('''
                *,
                users (id, full_name, email)
            ''').eq('family_group_id', family_group['id']).execute()
            
            return {
                "family_group": family_group,
                "members": members_response.data
            }
        except Exception as e:
            raise Exception(f"Error fetching family group with members: {str(e)}")
    
    async def get_family_member_by_user_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get family member record by user ID"""
        try:
            response = self.client.table('family_members').select('*').eq('user_id', user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            raise Exception(f"Error fetching family member: {str(e)}")
    
    async def add_family_member(self, member_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add family member"""
        try:
            response = self.client.table('family_members').insert(member_data).execute()
            return response.data[0]
        except Exception as e:
            raise Exception(f"Error adding family member: {str(e)}")
    
    async def get_family_members(self, user_id: str) -> List[Dict[str, Any]]:
        """Get family members"""
        try:
            # Get user's family group first
            member = await self.get_family_member_by_user_id(user_id)
            if not member:
                return []
            
            response = self.client.table('family_members').select('''
                *,
                users (id, full_name, email)
            ''').eq('family_group_id', member['family_group_id']).execute()
            
            return response.data
        except Exception as e:
            raise Exception(f"Error fetching family members: {str(e)}")
    
    async def can_access_family_member_data(self, user_id: str, member_user_id: str) -> bool:
        """Check if user can access family member's data"""
        try:
            # Get user's family member record
            user_member = await self.get_family_member_by_user_id(user_id)
            target_member = await self.get_family_member_by_user_id(member_user_id)
            
            if not user_member or not target_member:
                return False
            
            # Check if they're in the same family group
            if user_member['family_group_id'] != target_member['family_group_id']:
                return False
            
            # Check if user has manage permissions or is accessing their own data
            return user_member.get('can_manage', False) or user_id == member_user_id
            
        except Exception as e:
            return False
    
    async def update_family_member(self, member_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update family member"""
        try:
            response = self.client.table('family_members').update(update_data).eq('id', member_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            raise Exception(f"Error updating family member: {str(e)}")
    
    async def remove_family_member(self, member_id: str):
        """Remove family member"""
        try:
            self.client.table('family_members').delete().eq('id', member_id).execute()
        except Exception as e:
            raise Exception(f"Error removing family member: {str(e)}")
    
    async def create_family_invitation(self, family_group_id: str, invited_email: str, relationship: str, can_manage: bool, invited_by_user_id: str) -> Dict[str, Any]:
        """Create family invitation"""
        try:
            # For now, return a simple invitation object
            # In a full implementation, you'd store this in an invitations table
            return {
                "invitation_id": f"inv_{family_group_id}_{invited_email}",
                "family_group_id": family_group_id,
                "invited_email": invited_email,
                "relationship": relationship,
                "can_manage": can_manage,
                "invited_by": invited_by_user_id,
                "status": "pending"
            }
        except Exception as e:
            raise Exception(f"Error creating family invitation: {str(e)}")
    
    async def count_active_medications(self, user_id: str) -> int:
        """Count active medications for user"""
        try:
            response = self.client.table('medication_schedules').select('id').eq('user_id', user_id).eq('is_active', True).execute()
            return len(response.data)
        except Exception as e:
            return 0
    
    async def count_allergies(self, user_id: str) -> int:
        """Count allergies for user"""
        try:
            response = self.client.table('allergies').select('id').eq('user_id', user_id).execute()
            return len(response.data)
        except Exception as e:
            return 0
    
    async def count_upcoming_reminders(self, user_id: str, hours_ahead: int = 24) -> int:
        """Count upcoming reminders for user"""
        try:
            # Simplified count - in practice would calculate based on schedule
            response = self.client.table('medication_schedules').select('id').eq('user_id', user_id).eq('is_active', True).execute()
            return len(response.data)
        except Exception as e:
            return 0

    async def get_drug_interactions(self, drug1: str, drug2: str) -> List[Dict[str, Any]]:

        """Get drug interactions between two drugs"""
        try:
            response = self.client.table("drug_interactions") \
                .select("*") \
                .eq("drug1_name", drug1) \
                .eq("drug2_name", drug2) \
                .execute()
            interactions = response.data or []
            if not interactions:
                return []
            max_score = max(i.get("frequency_score", 0) for i in interactions)
            top_interactions = [
                i for i in interactions if i.get("frequency_score", 0) == max_score
            ]
            return top_interactions

        except Exception as e:
            print(f"Error when get drug name from Supabase: {e}")
            return []

        

 