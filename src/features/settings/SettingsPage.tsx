import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthContext';
import { getCurrentLocation } from '@/lib/geolocation';

interface Project {
  id: string; project_name: string; project_number: string; retention_days: number;
  site_latitude: number | null; site_longitude: number | null; geofence_radius_m: number; geofence_enforced: boolean;
}
interface Contractor { id: string; company_name: string; contact_name: string | null; email: string | null; status: string; }

export default function SettingsPage() {
  const { profile } = useAuth();
  const [retentionDays, setRetentionDays] = useState(60);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectNumber, setNewProjectNumber] = useState('');
  const [newContractorName, setNewContractorName] = useState('');
  const [newContractorEmail, setNewContractorEmail] = useState('');

  async function load() {
    const [{ data: settings }, { data: proj }, { data: cont }] = await Promise.all([
      supabase.from('system_settings').select('*').limit(1).maybeSingle(),
      supabase.from('projects').select('id, project_name, project_number, retention_days, site_latitude, site_longitude, geofence_radius_m, geofence_enforced').order('project_name'),
      supabase.from('contractors').select('id, company_name, contact_name, email, status').order('company_name')
    ]);
    if (settings) setRetentionDays(settings.project_default_retention_days);
    setProjects((proj ?? []) as Project[]);
    setContractors((cont ?? []) as Contractor[]);
  }
  useEffect(() => { load(); }, []);

  const isAdmin = profile?.role === 'administrator';

  async function saveRetention() {
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from('system_settings').update({ project_default_retention_days: retentionDays, updated_by: profile?.id }).eq('id', true);
      if (error) throw new Error(error.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function addProject() {
    if (!newProjectName.trim() || !newProjectNumber.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from('projects').insert({ project_name: newProjectName, project_number: newProjectNumber });
      if (error) throw new Error(error.message);
      setNewProjectName(''); setNewProjectNumber('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add project.');
    } finally {
      setSaving(false);
    }
  }

  async function addContractor() {
    if (!newContractorName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from('contractors').insert({ company_name: newContractorName, email: newContractorEmail || null });
      if (error) throw new Error(error.message);
      setNewContractorName(''); setNewContractorEmail('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add contractor.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleContractorStatus(c: Contractor) {
    setSaving(true);
    try {
      const { error } = await supabase.from('contractors').update({ status: c.status === 'active' ? 'inactive' : 'active' }).eq('id', c.id);
      if (error) throw new Error(error.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject(p: Project) {
    if (!window.confirm(`Delete project "${p.project_name}"? This cannot be undone.`)) return;
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from('projects').delete().eq('id', p.id);
      if (error) {
        // Postgres FK violation — permits still reference this project
        if (error.code === '23503') {
          throw new Error(`Cannot delete "${p.project_name}" — permits already exist for this project. Remove/archive those first, or leave the project in place.`);
        }
        throw new Error(error.message);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete project.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteContractor(c: Contractor) {
    if (!window.confirm(`Delete contractor "${c.company_name}"? This cannot be undone.`)) return;
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from('contractors').delete().eq('id', c.id);
      if (error) {
        if (error.code === '23503') {
          throw new Error(`Cannot delete "${c.company_name}" — permits or users already reference this contractor. Deactivate it instead.`);
        }
        throw new Error(error.message);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete contractor.');
    } finally {
      setSaving(false);
    }
  }

  async function useMyLocationForProject(projectId: string) {
    setSaving(true);
    setError(null);
    try {
      const coords = await getCurrentLocation();
      const { error } = await supabase.from('projects').update({ site_latitude: coords.latitude, site_longitude: coords.longitude }).eq('id', projectId);
      if (error) throw new Error(error.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to capture location.');
    } finally {
      setSaving(false);
    }
  }

  async function updateGeofence(projectId: string, patch: Partial<Pick<Project, 'geofence_radius_m' | 'geofence_enforced'>>) {
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from('projects').update(patch).eq('id', projectId);
      if (error) throw new Error(error.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update geofence.');
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return <div className="bg-white rounded-xl shadow-sm p-6 text-sm text-slate-500">Only administrators can access Settings.</div>;
  }

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base';

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-navy">Settings</h1>
      {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">Default Record Retention</h2>
        <div className="flex items-center gap-2">
          <input type="number" min={1} value={retentionDays} onChange={e => setRetentionDays(Number(e.target.value))} className={`${inputClass} w-24`} />
          <span className="text-sm text-slate-500">days</span>
        </div>
        <p className="text-xs text-slate-400">Applies to any project without its own override. Closed/expired/rejected/cancelled permits are archived (not deleted) once past this window.</p>
        <button onClick={saveRetention} disabled={saving} className="bg-brand text-white font-semibold py-2.5 px-4 rounded-lg text-sm disabled:opacity-60">
          Save Retention Setting
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">Projects & Site Geofencing</h2>
        <p className="text-xs text-slate-400">
          When geofencing is on for a project, users must be physically within range of the site to raise or approve
          permits for it — enforced in the database, not just the app. Stand at the site and tap "Use my location" to set it.
        </p>
        {projects.map(p => (
          <div key={p.id} className="border-b border-slate-100 last:border-0 py-3 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">{p.project_name} <span className="text-xs text-slate-400">({p.project_number})</span></span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{p.retention_days}d retention</span>
                <button onClick={() => deleteProject(p)} disabled={saving} className="text-danger text-xs font-semibold disabled:opacity-60">Delete</button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">
                {p.site_latitude != null ? `Site set: ${p.site_latitude.toFixed(5)}, ${p.site_longitude!.toFixed(5)}` : 'No site location set'}
              </span>
              <button onClick={() => useMyLocationForProject(p.id)} disabled={saving} className="text-brand font-medium disabled:opacity-60">
                Use my location
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 flex-1">Geofence radius (m)</label>
              <input type="number" min={50} defaultValue={p.geofence_radius_m}
                onBlur={e => updateGeofence(p.id, { geofence_radius_m: Number(e.target.value) })}
                className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
            </div>
            <label className="flex items-center justify-between text-xs">
              <span className={p.geofence_enforced ? 'text-slate-700 font-medium' : 'text-slate-500'}>
                Enforce geofencing on this project
              </span>
              <input type="checkbox" checked={p.geofence_enforced} disabled={saving || p.site_latitude == null}
                onChange={e => updateGeofence(p.id, { geofence_enforced: e.target.checked })}
                className="w-5 h-5 accent-brand" />
            </label>
            {p.geofence_enforced && p.site_latitude == null && (
              <div className="text-xs text-danger">Set a site location before enabling enforcement.</div>
            )}
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <input placeholder="Project name" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} className={inputClass} />
          <input placeholder="Number" value={newProjectNumber} onChange={e => setNewProjectNumber(e.target.value)} className={`${inputClass} w-28`} />
        </div>
        <button onClick={addProject} disabled={saving} className="bg-brand text-white font-semibold py-2.5 px-4 rounded-lg text-sm disabled:opacity-60">Add Project</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">Contractors</h2>
        {contractors.map(c => (
          <div key={c.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 last:border-0">
            <span>{c.company_name}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleContractorStatus(c)} disabled={saving}
                className={`text-xs font-semibold px-2 py-1 rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                {c.status}
              </button>
              <button onClick={() => deleteContractor(c)} disabled={saving} className="text-danger text-xs font-semibold disabled:opacity-60">Delete</button>
            </div>
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <input placeholder="Company name" value={newContractorName} onChange={e => setNewContractorName(e.target.value)} className={inputClass} />
          <input placeholder="Email" value={newContractorEmail} onChange={e => setNewContractorEmail(e.target.value)} className={inputClass} />
        </div>
        <button onClick={addContractor} disabled={saving} className="bg-brand text-white font-semibold py-2.5 px-4 rounded-lg text-sm disabled:opacity-60">Add Contractor</button>
      </div>
    </div>
  );
}
