import React, { useState } from 'react';
import { Calendar as CalendarIcon, Plus, Clock, MapPin, Trash2, Edit2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export default function Agenda() {
  const { agenda, addAgendaEvent, updateAgendaEvent, deleteAgendaEvent, addHistoryItem } = useAppStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const [eventForm, setEventForm] = useState({ title: '', date: formatDate(new Date()), time: '19:00', location: '', description: '' });

  const getEventsForDate = (dateStr: string) => {
    return agenda.filter(event => event.date === dateStr);
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();
    const days = [];

    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square flex items-center justify-center text-textSecondary/30"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = getEventsForDate(dateStr);
      const isToday = dateStr === formatDate(new Date());

      days.push(
        <div
          key={day}
          className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer ${
            isToday ? 'bg-primary text-white' : 'hover:bg-cardHover'
          }`}
        >
          <span className={`text-sm ${isToday ? 'font-bold' : 'text-textPrimary'}`}>{day}</span>
          {dayEvents.length > 0 && (
            <div className="flex gap-1 mt-1">
              {dayEvents.slice(0, 3).map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const sortedEvents = [...agenda].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const title = eventForm.title.trim();
    if (!title) return;

    addAgendaEvent({
      title,
      date: eventForm.date,
      time: eventForm.time,
      color: '#3B82F6',
      location: eventForm.location || undefined,
      description: eventForm.description || undefined,
    });
    addHistoryItem({
      type: 'event',
      title,
      description: 'Criou um evento na agenda',
    });
    setEventForm({ title: '', date: formatDate(new Date()), time: '19:00', location: '', description: '' });
    setIsCreateModalOpen(false);
  };

  const handleEditEvent = (eventId: string) => {
    const current = agenda.find((item) => item.id === eventId);
    if (!current) return;

    const title = window.prompt('Editar nome do evento:', current.title);
    if (!title?.trim()) return;

    const date = window.prompt('Editar data (AAAA-MM-DD):', current.date) || current.date;
    const time = window.prompt('Editar hora (HH:MM):', current.time) || current.time;
    const location = window.prompt('Editar local:', current.location || '') || '';
    const description = window.prompt('Editar descrição:', current.description || '') || '';

    updateAgendaEvent(eventId, {
      title: title.trim(),
      date,
      time,
      location: location || undefined,
      description: description || undefined,
    });
    addHistoryItem({
      type: 'event',
      title: title.trim(),
      description: 'Editou um evento da agenda',
    });
  };

  const handleDeleteEvent = (eventId: string) => {
    const current = agenda.find((item) => item.id === eventId);
    if (!current) return;

    deleteAgendaEvent(eventId);
    addHistoryItem({
      type: 'event',
      title: current.title,
      description: 'Excluiu um evento da agenda',
    });
  };

  return (
    <div className="p-8 overflow-y-auto h-[calc(100vh-80px)] fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-textPrimary">Agenda</h1>
        <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 rounded-xl transition-all neon-glow">
          <Plus size={20} />
          Novo Evento
        </button>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-3xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-textPrimary">Novo Evento</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-textSecondary hover:text-textPrimary">✕</button>
            </div>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm text-textSecondary mb-2">Título</label>
                <input value={eventForm.title} onChange={(e) => setEventForm((prev) => ({ ...prev, title: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-card/40 border border-primary/20 text-textPrimary" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-textSecondary mb-2">Data</label>
                  <input type="date" value={eventForm.date} onChange={(e) => setEventForm((prev) => ({ ...prev, date: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-card/40 border border-primary/20 text-textPrimary" required />
                </div>
                <div>
                  <label className="block text-sm text-textSecondary mb-2">Hora</label>
                  <input type="time" value={eventForm.time} onChange={(e) => setEventForm((prev) => ({ ...prev, time: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-card/40 border border-primary/20 text-textPrimary" required />
                </div>
              </div>
              <div>
                <label className="block text-sm text-textSecondary mb-2">Local</label>
                <input value={eventForm.location} onChange={(e) => setEventForm((prev) => ({ ...prev, location: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-card/40 border border-primary/20 text-textPrimary" />
              </div>
              <div>
                <label className="block text-sm text-textSecondary mb-2">Descrição</label>
                <textarea value={eventForm.description} onChange={(e) => setEventForm((prev) => ({ ...prev, description: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-card/40 border border-primary/20 text-textPrimary" rows={3} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-3 rounded-xl glass text-textSecondary">Cancelar</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-primary text-white">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-textPrimary">
                {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                  className="p-2 rounded-lg hover:bg-cardHover transition-colors"
                >
                  &lt;
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-4 py-2 rounded-lg bg-cardHover text-textPrimary"
                >
                  Hoje
                </button>
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                  className="p-2 rounded-lg hover:bg-cardHover transition-colors"
                >
                  &gt;
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-textSecondary mb-2">
              <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {renderCalendar()}
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-textPrimary mb-4">Próximos Eventos</h2>
            <div className="space-y-4">
              {sortedEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-4 p-4 rounded-xl bg-cardHover">
                  <div className="p-3 rounded-xl bg-blue-500/20">
                    <CalendarIcon size={20} className="text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-textPrimary">{event.title}</h3>
                    <p className="text-sm text-textSecondary flex items-center gap-2 mt-1">
                      <Clock size={14} />
                      {new Date(event.date).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} às {event.time}
                    </p>
                    {event.location && (
                      <p className="text-sm text-textSecondary flex items-center gap-2 mt-1">
                        <MapPin size={14} />
                        {event.location}
                      </p>
                    )}
                    {event.description && <p className="text-sm text-textSecondary mt-2">{event.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditEvent(event.id)} className="p-2 rounded-lg hover:bg-primary/20 text-textSecondary hover:text-primary transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDeleteEvent(event.id)} className="p-2 rounded-lg hover:bg-red-500/20 text-textSecondary hover:text-red-400 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-textPrimary mb-4">Hoje</h2>
            {getEventsForDate(formatDate(new Date())).length > 0 ? (
              <div className="space-y-4">
                {getEventsForDate(formatDate(new Date())).map((event) => (
                  <div key={event.id} className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-primary/20">
                    <h3 className="font-semibold text-textPrimary">{event.title}</h3>
                    <p className="text-sm text-textSecondary">{event.time}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-textSecondary">Nenhum evento para hoje</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
