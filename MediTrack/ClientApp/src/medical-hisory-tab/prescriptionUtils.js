// Utilities for mapping prescriptions and formatting dates
export function formatDate(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Map API prescriptions array to UI records (one record per prescription_id)
export function mapPrescriptionsToRecords(prescriptions = []) {
  if (!Array.isArray(prescriptions)) return [];
  return prescriptions.map((p) => ({
    prescription_id: p.prescription_id,
    disease_name: p.disease_name || p.notes || 'Unknown',
    created_at: p.created_at || p.prescription_date || null,
    upload_id: p.upload_id || null,
    medications: (Array.isArray(p.medications) ? p.medications : []).map((m) => ({
      id: m.id || `${p.prescription_id || ''}-${m.name || m.medication_name}`,
      name: m.name || m.medication_name || '',
      dosage: m.dosage || null,
      frequency: m.frequency || null,
      duration: m.duration || null,
      start_date: m.start_date || null,
      end_date: m.end_date || null,
      notes: m.notes || null,
    })),
  }));
}

export default { formatDate, mapPrescriptionsToRecords };

