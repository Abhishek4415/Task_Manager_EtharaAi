import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { todoSessionSchema, type TodoSessionInput } from '../lib/schemas';
import { useProjects } from '../hooks/useProjects';
import { useMyTeam } from '../hooks/useAuth';
import { useCreateTodoSession } from '../hooks/useTodoSessions';
import { getInitials } from '../lib/utils';
import { todayISO } from '../lib/utils';

interface CustomButton { id: string; label: string; buttonType: 'DONE_ALL' | 'COUNT_INPUT' | 'PARTIAL_DONE' | 'CUSTOM'; color: string; isCountInput: boolean; sortOrder: number }

const STEPS = ['Session Setup', 'Assign Taskers', 'Custom Buttons', 'Review & Create'];

function SortableButton({ btn, onRemove, onChange }: { btn: CustomButton; onRemove: () => void; onChange: (field: keyof CustomButton, val: string | boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: btn.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={{ ...style, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 14px' }}>
      <button {...attributes} {...listeners} style={{ background: 'none', border: 'none', color: 'var(--color-text-subtle)', cursor: 'grab' }}><GripVertical size={16} /></button>
      <input className="input-base" value={btn.label} onChange={(e) => onChange('label', e.target.value)} style={{ flex: 1 }} placeholder="Button label" />
      <select className="input-base" value={btn.buttonType} onChange={(e) => onChange('buttonType', e.target.value)} style={{ width: 140 }}>
        <option value="DONE_ALL">All Done</option>
        <option value="COUNT_INPUT">Count Input</option>
        <option value="PARTIAL_DONE">Partial Done</option>
        <option value="CUSTOM">Custom</option>
      </select>
      <input type="color" value={btn.color} onChange={(e) => onChange('color', e.target.value)} style={{ width: 36, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none' }} />
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}><Trash2 size={16} /></button>
    </div>
  );
}

export default function CreateTodoPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [taskType, setTaskType] = useState<'NON_STEM' | 'STEM'>('NON_STEM');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [buttons, setButtons] = useState<CustomButton[]>([
    { id: '1', label: 'All Done', buttonType: 'DONE_ALL', color: '#22c55e', isCountInput: false, sortOrder: 0 },
    { id: '2', label: 'Count Done', buttonType: 'COUNT_INPUT', color: '#3b82f6', isCountInput: true, sortOrder: 1 },
    { id: '3', label: 'Partial', buttonType: 'PARTIAL_DONE', color: '#f59e0b', isCountInput: false, sortOrder: 2 },
  ]);

  const { data: projects = [] } = useProjects();
  const { data: teamData } = useMyTeam();
  const createMut = useCreateTodoSession();
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const form = useForm<TodoSessionInput>({ resolver: zodResolver(todoSessionSchema), defaultValues: { date: todayISO(), taskType: 'NON_STEM', assigneeIds: [], customButtons: [] } });
  const { register, watch, setValue, formState: { errors } } = form;
  const watchedProjectId = watch('projectId');
  const selectedProject = (projects as { _id: string; name: string; dailyTarget?: number; taskType: string }[]).find((p) => p._id === watchedProjectId);
  const taskers = (teamData as { taskers?: { _id: string; fullName: string; qualityReviewerId?: { fullName: string } }[] })?.taskers || [];

  const toggleAssignee = (id: string) => {
    setSelectedAssignees((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]);
    setValue('assigneeIds', selectedAssignees.includes(id) ? selectedAssignees.filter((a) => a !== id) : [...selectedAssignees, id]);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (active.id !== over?.id) {
      setButtons((items) => { const o = items.findIndex((i) => i.id === active.id); const n = items.findIndex((i) => i.id === over?.id); return arrayMove(items, o, n).map((b, idx) => ({ ...b, sortOrder: idx })); });
    }
  };

  const addButton = () => setButtons((prev) => [...prev, { id: Date.now().toString(), label: 'Custom', buttonType: 'CUSTOM', color: '#8b5cf6', isCountInput: false, sortOrder: prev.length }]);

  const nextStep = async (targetStep: number) => {
    if (step === 0 && targetStep === 1) {
      const isValid = await form.trigger(['title', 'date', 'projectId']);
      if (!isValid) return;
    }
    if (step === 1 && targetStep === 2) {
      const isValid = await form.trigger(['assigneeIds']);
      if (!isValid) return;
    }
    setStep(targetStep);
  };

  const onSubmit = form.handleSubmit((data) => {
    createMut.mutate(
      { ...data, taskType, assigneeIds: selectedAssignees, customButtons: buttons.map((b, i) => ({ ...b, sortOrder: i })) },
      { onSuccess: () => navigate('/team-progress') }
    );
  });

  return (
    <div style={{ width: '100%' }}>
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: i <= step ? 'var(--color-teal)' : 'var(--color-card)', color: i <= step ? '#0d1117' : 'var(--color-text-muted)', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${i <= step ? 'var(--color-teal)' : 'var(--color-border)'}`, transition: 'all 0.2s', flexShrink: 0 }}>{i + 1}</div>
              <span style={{ fontSize: 13, fontWeight: i === step ? 600 : 400, color: i === step ? 'var(--color-text)' : 'var(--color-text-muted)', display: step === i || i === 0 ? 'block' : 'none' }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i < step ? 'var(--color-teal)' : 'var(--color-border)', margin: '0 8px', transition: 'background 0.2s' }} />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 0: Session Setup */}
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 28 }}>
              <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Session Setup</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }}>Session Title *</label>
                  <input className="input-base" placeholder="Monday Annotation Batch" {...register('title')} />
                  {errors.title && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>{errors.title.message}</p>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }}>Date *</label>
                    <input type="date" className="input-base" {...register('date')} />
                    {errors.date && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>{errors.date.message}</p>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6 }}>Project *</label>
                    <select className="input-base" {...register('projectId')}>
                      <option value="">— Select Project —</option>
                      {(projects as { _id: string; name: string }[]).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                    {errors.projectId && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 4 }}>{errors.projectId.message}</p>}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 10 }}>Task Type</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {(['NON_STEM', 'STEM'] as const).map((t) => (
                      <button key={t} type="button" onClick={() => { setTaskType(t); setValue('taskType', t); }} style={{ padding: '10px 24px', borderRadius: 10, border: '1px solid', borderColor: taskType === t ? 'var(--color-teal)' : 'var(--color-border)', background: taskType === t ? 'var(--color-teal-muted)' : 'var(--color-card)', color: taskType === t ? 'var(--color-teal)' : 'var(--color-text)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>{t}</button>
                    ))}
                  </div>
                  {taskType === 'NON_STEM' && selectedProject?.dailyTarget && (
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 8 }}>Daily target for this project: <strong style={{ color: 'var(--color-teal)' }}>{selectedProject.dailyTarget} tasks</strong></p>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => nextStep(1)}>Next <ChevronRight size={16} /></button>
            </div>
          </motion.div>
        )}

        {/* Step 1: Assign Taskers */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontWeight: 700, fontSize: 18 }}>Assign Taskers</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--color-teal)', fontWeight: 600 }}>{selectedAssignees.length} selected</span>
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => { const allIds = taskers.map((t) => t._id); const allSelected = allIds.every((id) => selectedAssignees.includes(id)); if (allSelected) { setSelectedAssignees([]); setValue('assigneeIds', []); } else { setSelectedAssignees(allIds); setValue('assigneeIds', allIds); } }}>Select All</button>
                </div>
              </div>
              {taskers.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 40 }}>No taskers in your team yet. Register taskers first.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {taskers.map((t) => (
                    <label key={t._id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: selectedAssignees.includes(t._id) ? 'var(--color-teal-muted)' : 'var(--color-card)', border: `1px solid ${selectedAssignees.includes(t._id) ? 'var(--color-teal)' : 'var(--color-border)'}`, borderRadius: 10, padding: '12px 16px', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <input type="checkbox" checked={selectedAssignees.includes(t._id)} onChange={() => toggleAssignee(t._id)} style={{ accentColor: 'var(--color-teal)' }} />
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--color-teal-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: 'var(--color-teal)' }}>{getInitials(t.fullName)}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{t.fullName}</div>
                        {t.qualityReviewerId && <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>QR: {(t.qualityReviewerId as { fullName: string }).fullName}</div>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {errors.assigneeIds && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 10 }}>{errors.assigneeIds.message}</p>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep(0)}><ChevronLeft size={16} /> Back</button>
              <button className="btn btn-primary" onClick={() => nextStep(2)}>Next <ChevronRight size={16} /></button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Custom Buttons */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 28 }}>
                <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Button Builder</h2>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={buttons.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                      {buttons.map((btn) => (
                        <SortableButton key={btn.id} btn={btn}
                          onRemove={() => setButtons((prev) => prev.filter((b) => b.id !== btn.id))}
                          onChange={(field, val) => setButtons((prev) => prev.map((b) => b.id === btn.id ? { ...b, [field]: val } : b))}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addButton} style={{ width: '100%', justifyContent: 'center' }}>
                  <Plus size={14} /> Add Custom Button
                </button>
              </div>
              {/* Live preview */}
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 20, position: 'sticky', top: 80 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-subtle)', letterSpacing: 2, marginBottom: 14 }}>TASKER PREVIEW</div>
                <div style={{ background: 'var(--color-card)', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{watch('title') || 'Session Title'}</div>
                  {selectedProject?.dailyTarget && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>Target: {selectedProject.dailyTarget} tasks</div>}
                  <div className="progress-bar" style={{ marginBottom: 16 }}><div className="progress-fill" style={{ width: '40%' }} /></div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {buttons.map((btn) => (
                      <div key={btn.id} style={{ padding: '6px 12px', borderRadius: 8, background: btn.color, color: '#fff', fontSize: 12, fontWeight: 600 }}>{btn.label}{btn.isCountInput ? ': [___]' : ''}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}><ChevronLeft size={16} /> Back</button>
              <button className="btn btn-primary" onClick={() => nextStep(3)}>Next <ChevronRight size={16} /></button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Review & Create */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 28 }}>
              <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Review & Create</h2>
              {[
                { label: 'Title', value: watch('title') },
                { label: 'Date', value: watch('date') },
                { label: 'Project', value: selectedProject?.name || '—' },
                { label: 'Task Type', value: taskType },
                { label: 'Assignees', value: `${selectedAssignees.length} taskers` },
                { label: 'Buttons', value: `${buttons.length} buttons` },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>{row.label}</span>
                  <span style={{ fontWeight: 600 }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)}><ChevronLeft size={16} /> Back</button>
              <button className="btn btn-primary btn-lg" onClick={onSubmit} disabled={createMut.isPending}>
                {createMut.isPending ? 'Creating...' : '✓ Create TODO Session'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
