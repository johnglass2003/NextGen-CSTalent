/**
 * InternalCalendar Component
 * Full calendar view with event management for internal team
 */

'use client';

import { Calendar, momentLocalizer, Views, ToolbarProps, Navigate } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import DateTimePicker from 'react-datetime-picker';
import 'react-datetime-picker/dist/DateTimePicker.css';
import 'react-calendar/dist/Calendar.css';
import 'react-clock/dist/Clock.css';
import '@/app/internal/dashboard/calendar-styles.css';
import styles from './InternalCalendar.module.css';

type DateTimeValue = Date | null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const localizer = momentLocalizer(moment);

// Types
export type EventType = 'student_interview' | 'company_call' | 'internal_block';
export type EventStatus = 'scheduled' | 'completed' | 'cancelled';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  event_type: EventType;
  description?: string;
  student_id?: string;
  company_id?: string;
  interviewer_id?: string;
  meeting_link?: string;
  notes?: string;
  status: EventStatus;
  studentName?: string | null;
  companyName?: string | null;
}

// Custom Toolbar Component
function CustomToolbar({ label, onNavigate }: ToolbarProps<CalendarEvent, object>) {
  return (
    <div className={styles.customToolbar}>
      <button
        type="button"
        onClick={() => onNavigate(Navigate.PREVIOUS)}
        className={styles.navButton}
        aria-label="Previous month"
      >
        <ChevronLeftIcon />
        <span>Previous</span>
      </button>
      <span className={styles.toolbarLabel}>{label}</span>
      <button
        type="button"
        onClick={() => onNavigate(Navigate.NEXT)}
        className={styles.navButton}
        aria-label="Next month"
      >
        <span>Next</span>
        <ChevronRightIcon />
      </button>
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  );
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface Company {
  id: string;
  company_name: string;
}

// Color map for event types
const EVENT_COLORS: Record<EventType, string> = {
  student_interview: '#4A90E2', // Blue
  company_call: '#F5A623',      // Orange
  internal_block: '#7B68EE',    // Purple
};

export default function InternalCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSlotDate, setSelectedSlotDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showModal || showCreateModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showModal, showCreateModal]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          *,
          students (first_name, last_name),
          companies (company_name)
        `)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        return;
      }

      const formattedEvents: CalendarEvent[] = (data || []).map((event) => ({
        id: event.id,
        title: event.title,
        start: new Date(event.start_time),
        end: new Date(event.end_time),
        event_type: event.event_type as EventType,
        description: event.description,
        student_id: event.student_id,
        company_id: event.company_id,
        interviewer_id: event.interviewer_id,
        meeting_link: event.meeting_link,
        notes: event.notes,
        status: event.status as EventStatus,
        studentName: event.students
          ? `${event.students.first_name} ${event.students.last_name}`
          : null,
        companyName: event.companies?.company_name || null,
      }));

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error in fetchEvents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const backgroundColor = EVENT_COLORS[event.event_type] || '#888';
    const opacity = event.status === 'cancelled' ? 0.5 : 0.9;

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity,
        color: 'white',
        border: '0px',
        display: 'block',
        textDecoration: event.status === 'cancelled' ? 'line-through' : 'none',
      },
    };
  };

  const handleCreateEvent = async (eventData: CreateEventData) => {
    try {
      const { error } = await supabase.from('calendar_events').insert({
        event_type: eventData.event_type,
        title: eventData.title,
        description: eventData.description || null,
        student_id: eventData.student_id || null,
        company_id: eventData.company_id || null,
        interviewer_id: eventData.interviewer_id || null,
        start_time: eventData.start_time,
        end_time: eventData.end_time,
        status: 'scheduled',
        meeting_link: eventData.meeting_link || null,
        notes: eventData.notes || null,
      });

      if (error) {
        console.error('Error creating event:', error);
        return false;
      }

      fetchEvents();
      setShowCreateModal(false);
      return true;
    } catch (error) {
      console.error('Error in handleCreateEvent:', error);
      return false;
    }
  };

  const handleUpdateEventStatus = async (eventId: string, status: EventStatus) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({ status })
        .eq('id', eventId);

      if (error) {
        console.error('Error updating event:', error);
        return;
      }

      fetchEvents();
      setShowModal(false);
    } catch (error) {
      console.error('Error in handleUpdateEventStatus:', error);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className={styles.calendarContainer}>
      <div className={styles.calendarHeader}>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span
              className={styles.legendColor}
              style={{ backgroundColor: EVENT_COLORS.student_interview }}
            ></span>
            Student Interview
          </span>
          <span className={styles.legendItem}>
            <span
              className={styles.legendColor}
              style={{ backgroundColor: EVENT_COLORS.company_call }}
            ></span>
            Company Call
          </span>
          <span className={styles.legendItem}>
            <span
              className={styles.legendColor}
              style={{ backgroundColor: EVENT_COLORS.internal_block }}
            ></span>
            Internal Block
          </span>
        </div>
        <button
          onClick={() => {
            setSelectedSlotDate(null);
            setShowCreateModal(true);
          }}
          className={styles.addButton}
        >
          + Add Event
        </button>
      </div>

      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%', minHeight: '600px' }}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={eventStyleGetter}
        views={[Views.MONTH]}
        defaultView={Views.MONTH}
        toolbar={true}
        components={{
          toolbar: CustomToolbar,
        }}
        popup
        selectable
        onSelectSlot={(slotInfo) => {
          setSelectedSlotDate(slotInfo.start);
          setShowCreateModal(true);
        }}
      />

      {showModal && selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setShowModal(false)}
          onUpdateStatus={handleUpdateEventStatus}
        />
      )}

      {showCreateModal && (
        <CreateEventModal
          onClose={() => {
            setShowCreateModal(false);
            setSelectedSlotDate(null);
          }}
          onCreate={handleCreateEvent}
          initialDate={selectedSlotDate}
        />
      )}
    </div>
  );
}

// Event Details Modal
interface EventDetailsModalProps {
  event: CalendarEvent;
  onClose: () => void;
  onUpdateStatus: (eventId: string, status: EventStatus) => void;
}

function EventDetailsModal({ event, onClose, onUpdateStatus }: EventDetailsModalProps) {
  const formatEventType = (type: EventType) => {
    const typeMap: Record<EventType, string> = {
      student_interview: 'Student Interview',
      company_call: 'Company Call',
      internal_block: 'Internal Block',
    };
    return typeMap[type] || type;
  };

  const formatStatus = (status: EventStatus) => {
    const statusMap: Record<EventStatus, string> = {
      scheduled: 'Scheduled',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return statusMap[status] || status;
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{event.title}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Type:</span>
            <span
              className={styles.eventTypeBadge}
              style={{ backgroundColor: EVENT_COLORS[event.event_type] }}
            >
              {formatEventType(event.event_type)}
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Status:</span>
            <span className={`${styles.statusBadge} ${styles[event.status]}`}>
              {formatStatus(event.status)}
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Date:</span>
            <span>{moment(event.start).format('MMMM D, YYYY')}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Time:</span>
            <span>
              {moment(event.start).format('h:mm A')} - {moment(event.end).format('h:mm A')}
            </span>
          </div>

          {event.studentName && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Student:</span>
              <span>{event.studentName}</span>
            </div>
          )}

          {event.companyName && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Company:</span>
              <span>{event.companyName}</span>
            </div>
          )}

          {event.description && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Description:</span>
              <p className={styles.description}>{event.description}</p>
            </div>
          )}

          {event.meeting_link && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Meeting:</span>
              <a
                href={event.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.meetingLink}
              >
                Join Meeting
              </a>
            </div>
          )}

          {event.notes && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Notes:</span>
              <p className={styles.notes}>{event.notes}</p>
            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          {event.status === 'scheduled' && (
            <>
              <button
                className={`${styles.actionButton} ${styles.completeButton}`}
                onClick={() => onUpdateStatus(event.id, 'completed')}
              >
                Mark Completed
              </button>
              <button
                className={`${styles.actionButton} ${styles.cancelButton}`}
                onClick={() => onUpdateStatus(event.id, 'cancelled')}
              >
                Cancel Event
              </button>
            </>
          )}
          <button className={styles.closeModalButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Create Event Modal
interface CreateEventData {
  event_type: EventType;
  title: string;
  description: string;
  start_time: Date | null;
  end_time: Date | null;
  student_id: string;
  company_id: string;
  interviewer_id: string;
  meeting_link: string;
  notes: string;
}

interface CreateEventModalProps {
  onClose: () => void;
  onCreate: (eventData: CreateEventData) => Promise<boolean>;
  initialDate?: Date | null;
}

function CreateEventModal({ onClose, onCreate, initialDate }: CreateEventModalProps) {
  // Get initial start time (use initialDate if provided, else current time rounded to next hour)
  const getInitialStartTime = (): Date => {
    if (initialDate) {
      const date = new Date(initialDate);
      date.setHours(9, 0, 0, 0); // Default to 9 AM
      return date;
    }
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0); // Round to next hour
    return now;
  };

  // Get initial end time (1 hour after start)
  const getInitialEndTime = (startTime: Date): Date => {
    return new Date(startTime.getTime() + 60 * 60 * 1000);
  };

  const initialStart = getInitialStartTime();
  const initialEnd = getInitialEndTime(initialStart);

  const [formData, setFormData] = useState<CreateEventData>({
    event_type: 'student_interview',
    title: '',
    description: '',
    start_time: initialStart,
    end_time: initialEnd,
    student_id: '',
    company_id: '',
    interviewer_id: '',
    meeting_link: '',
    notes: '',
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStudentsAndCompanies();
  }, []);

  async function fetchStudentsAndCompanies() {
    try {
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .order('last_name', { ascending: true });

      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, company_name')
        .eq('is_active', true)
        .order('company_name', { ascending: true });

      setStudents(studentsData || []);
      setCompanies(companiesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!formData.start_time || !formData.end_time) {
      setError('Start and end time are required');
      return;
    }

    if (formData.end_time <= formData.start_time) {
      setError('End time must be after start time');
      return;
    }

    setSubmitting(true);
    // Convert Date objects to ISO strings for database
    const eventData = {
      ...formData,
      start_time: formData.start_time.toISOString(),
      end_time: formData.end_time.toISOString(),
    };
    const success = await onCreate(eventData as unknown as CreateEventData);
    setSubmitting(false);

    if (!success) {
      setError('Failed to create event. Please try again.');
    }
  };

  // Calculate duration in minutes
  const getDurationMinutes = (): number => {
    if (!formData.start_time || !formData.end_time) return 0;
    return Math.round((formData.end_time.getTime() - formData.start_time.getTime()) / (1000 * 60));
  };

  // Handle start time change - auto-update end time to 1 hour later
  const handleStartTimeChange = (date: DateTimeValue) => {
    if (date) {
      setFormData({
        ...formData,
        start_time: date,
        end_time: new Date(date.getTime() + 60 * 60 * 1000),
      });
    } else {
      setFormData({ ...formData, start_time: null });
    }
  };

  // Handle end time change
  const handleEndTimeChange = (date: DateTimeValue) => {
    setFormData({ ...formData, end_time: date });
  };

  const handleEventTypeChange = (type: EventType) => {
    setFormData({
      ...formData,
      event_type: type,
      student_id: '',
      company_id: '',
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles.createModal}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Create New Event</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.formGroup}>
            <label className={styles.label}>Event Type *</label>
            <select
              value={formData.event_type}
              onChange={(e) => handleEventTypeChange(e.target.value as EventType)}
              className={styles.select}
              required
            >
              <option value="student_interview">Student Interview</option>
              <option value="company_call">Company Call</option>
              <option value="internal_block">Internal Block</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={styles.input}
              placeholder="e.g., Technical Interview - John Doe"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={styles.textarea}
              rows={3}
              placeholder="Optional event description..."
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Start Time *</label>
              <DateTimePicker
                onChange={handleStartTimeChange}
                value={formData.start_time}
                disableClock={true}
                format="y-MM-dd h:mm a"
                clearIcon={null}
                calendarIcon={null}
                className={styles.dateTimePicker}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>End Time *</label>
              <DateTimePicker
                onChange={handleEndTimeChange}
                value={formData.end_time}
                disableClock={true}
                format="y-MM-dd h:mm a"
                clearIcon={null}
                calendarIcon={null}
                className={styles.dateTimePicker}
              />
              <small className="duration-display">
                Duration: {getDurationMinutes()} minutes
              </small>
            </div>
          </div>

          {formData.event_type === 'student_interview' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Student</label>
              <select
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                className={styles.select}
              >
                <option value="">Select student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.event_type === 'company_call' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Company</label>
              <select
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                className={styles.select}
              >
                <option value="">Select company...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label}>Meeting Link</label>
            <input
              type="url"
              value={formData.meeting_link}
              onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
              className={styles.input}
              placeholder="https://zoom.us/j/..."
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className={styles.textarea}
              rows={3}
              placeholder="Internal notes about this event..."
            />
          </div>

          <div className={styles.formActions}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Event'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelFormButton}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
