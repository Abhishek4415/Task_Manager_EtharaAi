import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, FolderOpen } from 'lucide-react';
import { projectSchema, type ProjectInput } from '../lib/schemas';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '../hooks/useProjects';

type Project = { _id: string; name: string; description?: string; taskType: string; dailyTarget?: number; status: string };

export default function ProjectsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  const { data: projects = [], isLoading } = useProjects();
  const createMut = useCreateProject();
  const updateMut = useUpdateProject();
  const deleteMut = useDeleteProject();

  const form = useForm<ProjectInput>({ resolver: zodResolver(projectSchema), defaultValues: { taskType: 'NON_STEM', status: 'ACTIVE' } });
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = form;
  const taskType = watch('taskType');

  const openCreate = () => { setEditing(null); reset({ taskType: 'NON_STEM', status: 'ACTIVE' }); setShowForm(true); };
  const openEdit = (p: Project) => { setEditing(p); reset({ name: p.name, description: p.description, taskType: p.taskType as 'STEM' | 'NON_STEM', dailyTarget: p.dailyTarget, status: p.status }); setShowForm(true); };

  const onSubmit = handleSubmit((data) => {
    if (editing) {
      updateMut.mutate({ id: editing._id, data }, { onSuccess: () => { setShowForm(false); reset(); setEditing(null); } });
    } else {
      createMut.mutate(data, { onSuccess: () => { setShowForm(false); reset(); } });
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> New Project</button>
      </div>

      {/* Modal form */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100 }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }} animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
              style={{ position: 'fixed', top: '50%', left: '50%', width: '90%', maxWidth: 520, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 32, zIndex: 101 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontWeight: 700, fontSize: 18 }}>{editing ? 'Edit Project' : 'New Project'}</h2>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}><X size={18} /></button>
              </div>
              <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }}>Project Name *</label>
                  <input className="input-base" placeholder="Data Labeling Q2" {...register('name')} />
                  {errors.name && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>{errors.name.message}</p>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }}>Description</label>
                  <textarea className="input-base" rows={2} placeholder="Optional description..." {...register('description')} style={{ resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 8 }}>Task Type</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {(['NON_STEM', 'STEM'] as const).map((t) => (
                      <button key={t} type="button" onClick={() => setValue('taskType', t)} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid', borderColor: taskType === t ? 'var(--color-teal)' : 'var(--color-border)', background: taskType === t ? 'var(--color-teal-muted)' : 'transparent', color: taskType === t ? 'var(--color-teal)' : 'var(--color-text-muted)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{t}</button>
                    ))}
                  </div>
                </div>
                {taskType === 'NON_STEM' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }}>Daily Target (tasks/person) *</label>
                    <input type="number" className="input-base" placeholder="90" {...register('dailyTarget', { setValueAs: (v) => v === '' || Number.isNaN(Number(v)) ? undefined : Number(v) })} />
                    {errors.dailyTarget && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>{errors.dailyTarget.message}</p>}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={createMut.isPending || updateMut.isPending}>
                    {editing ? 'Save Changes' : 'Create Project'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>Loading projects...</div>
      ) : (projects as Project[]).length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--color-text-muted)' }}>
          <FolderOpen size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
          <p>No projects yet. Create your first project!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {(projects as Project[]).map((project) => (
            <motion.div key={project._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderTop: `3px solid var(--color-teal)`, borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{project.name}</div>
                  <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'var(--color-teal-muted)', color: 'var(--color-teal)' }}>{project.taskType}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(project)}><Edit2 size={14} /></button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => { if (confirm('Delete this project?')) deleteMut.mutate(project._id); }}><Trash2 size={14} /></button>
                </div>
              </div>
              {project.description && <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>{project.description}</p>}
              {project.taskType === 'NON_STEM' && project.dailyTarget && (
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Daily Target: <strong style={{ color: 'var(--color-text)' }}>{project.dailyTarget} tasks</strong></div>
              )}
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="status-dot" style={{ background: project.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-text-subtle)' }} />
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{project.status}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
