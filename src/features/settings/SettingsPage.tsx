import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthContext';

interface Project { id: string; project_name: string; project_number: string; retention_days: number; }
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
      supabase.from('projects').select('id, project_name, project_number, retention_days').order('project_name'),
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
        <h2 className="text-sm font-semibold text-slate-700">Projects</h2>
        {projects.map(p => (
          <div key={p.id} className="flex justify-between text-sm py-1.5 border-b border-slate-100 last:border-0">
            <span>{p.project_name} <span className="text-xs text-slate-400">({p.project_number})</span></span>
            <span className="text-xs text-slate-400">{p.retention_days}d retention</span>
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
            <button onClick={() => toggleContractorStatus(c)} disabled={saving}
              className={`text-xs font-semibold px-2 py-1 rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
              {c.status}
            </button>
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
