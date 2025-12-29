'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ProtectedRoute } from '@/components/auth';
import styles from './page.module.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  message: string;
  is_read: boolean;
  archived: boolean;
  created_at: string;
  student_id?: string;
};

type Conversation = {
  conversation_id: string;
  subject: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  messages: Message[];
};

export default function StudentMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  useEffect(() => {
    fetchConversations();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (selectedConversation && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [selectedConversation?.messages]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('student-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  async function fetchConversations() {
    try {
      // Get dev user from localStorage
      const devUserStr = localStorage.getItem('dev_user');
      if (!devUserStr) {
        setError('Not logged in. Please use dev-login.');
        setLoading(false);
        return;
      }

      const devUser = JSON.parse(devUserStr);

      // Get the user record from database
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id, role, email')
        .eq('email', devUser.email)
        .single();

      if (userError || !userRecord) {
        setError(`User ${devUser.email} not found in database.`);
        setLoading(false);
        return;
      }

      setCurrentUserId(userRecord.id);

      // Get student record
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('auth_user_id', userRecord.id)
        .single();

      if (studentError || !student) {
        setError('Student record not found.');
        setLoading(false);
        return;
      }

      setStudentId(student.id);

      // Fetch messages where student is involved
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('student_id', student.id)
        .eq('archived', false)
        .order('created_at', { ascending: true });

      if (messagesError) {
        setError(`Error fetching messages: ${messagesError.message}`);
        setLoading(false);
        return;
      }

      if (!messages || messages.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Group messages by conversation_id
      const conversationMap = new Map<string, Conversation>();

      messages.forEach((msg: Message) => {
        if (!conversationMap.has(msg.conversation_id)) {
          conversationMap.set(msg.conversation_id, {
            conversation_id: msg.conversation_id,
            subject: msg.subject || 'No Subject',
            last_message: msg.message,
            last_message_time: msg.created_at,
            unread_count: 0,
            messages: [],
          });
        }

        const conv = conversationMap.get(msg.conversation_id)!;
        conv.messages.push(msg);
        conv.last_message = msg.message;
        conv.last_message_time = msg.created_at;

        if (!msg.is_read && msg.recipient_id === userRecord.id) {
          conv.unread_count++;
        }
      });

      const conversationsArray = Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());

      setConversations(conversationsArray);

      // Update selected conversation if it exists
      if (selectedConversation) {
        const updated = conversationsArray.find(c => c.conversation_id === selectedConversation.conversation_id);
        if (updated) {
          setSelectedConversation(updated);
        }
      }
      setLoading(false);

    } catch (err: any) {
      setError(`Unexpected error: ${err.message}`);
      setLoading(false);
    }
  }

  async function handleSelectConversation(conv: Conversation) {
    setSelectedConversation(conv);
    // Mark messages as read
    const unreadMessageIds = conv.messages
      .filter(msg => !msg.is_read && msg.recipient_id === currentUserId)
      .map(msg => msg.id);

    if (unreadMessageIds.length > 0) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', unreadMessageIds);
      fetchConversations();
    }
  }

  async function handleSendReply() {
    if (!replyText.trim() || !selectedConversation || !currentUserId || !studentId) return;

    setSending(true);

    try {
      // Find the internal user from the conversation
      const internalUserId = selectedConversation.messages.find(
        m => m.sender_id !== currentUserId
      )?.sender_id;

      if (!internalUserId) {
        alert('Could not find recipient.');
        setSending(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('messages')
        .insert([{
          sender_id: currentUserId,
          recipient_id: internalUserId,
          student_id: studentId,
          subject: selectedConversation.subject,
          message: replyText.trim(),
          conversation_id: selectedConversation.conversation_id,
          is_read: false,
          archived: false,
        }]);

      if (insertError) {
        alert(`Failed to send message: ${insertError.message}`);
      } else {
        setReplyText('');
        await fetchConversations();
      }

    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSending(false);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['student']}>
        <div className={styles.container}>
          <h1>Messages</h1>
          <p>Loading messages...</p>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute allowedRoles={['student']}>
        <div className={styles.container}>
          <h1>Messages</h1>
          <div className={styles.errorBox}>
            <strong>Error:</strong> {error}
          </div>
          <button
            onClick={() => (window.location.href = '/dev-login')}
            className={styles.button}
          >
            Back to Login
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <div className={styles.messagesPage}>
        <div className={styles.header}>
          <h1>Messages</h1>
          <div className={styles.stats}>
            {conversations.length} conversation(s) · {conversations.reduce((sum, c) => sum + c.unread_count, 0)} unread
          </div>
        </div>

        <div className={styles.splitView}>
          {/* LEFT PANE: Conversation List */}
          <div className={styles.conversationList}>
            {conversations.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No conversations yet.</p>
                <p className={styles.emptySubtext}>
                  Messages from the NextGen CS Talent team will appear here.
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.conversation_id}
                  className={`${styles.conversationItem} ${
                    selectedConversation?.conversation_id === conv.conversation_id
                      ? styles.selected
                      : ''
                  }`}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <div className={styles.conversationHeader}>
                    <span className={styles.icon}>🏛️</span>
                    <span className={styles.userName}>NextGen CS Talent</span>
                    {conv.unread_count > 0 && (
                      <span className={styles.unreadBadge}>{conv.unread_count}</span>
                    )}
                  </div>
                  <div className={styles.subject}>{conv.subject}</div>
                  <div className={styles.preview}>{conv.last_message}</div>
                  <div className={styles.timestamp}>
                    {new Date(conv.last_message_time).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* RIGHT PANE: Message Thread */}
          <div className={styles.messageThread}>
            {!selectedConversation ? (
              <div className={styles.noSelection}>
                <p>👈 Select a conversation to view messages</p>
              </div>
            ) : (
              <>
                {/* Thread Header */}
                <div className={styles.threadHeader}>
                  <div className={styles.threadTitle}>
                    <span className={styles.icon}>🏛️</span>
                    <div>
                      <div className={styles.threadName}>NextGen CS Talent</div>
                      <div className={styles.threadSubject}>
                        {selectedConversation.subject}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className={styles.messagesContainer} ref={messagesContainerRef}>
                  {selectedConversation.messages.map((msg) => {
                    const isFromMe = msg.sender_id === currentUserId;
                    const senderName = isFromMe ? 'You' : 'NextGen CS Talent';

                    return (
                      <div
                        key={msg.id}
                        className={`${styles.messageBubble} ${isFromMe ? styles.fromMe : styles.fromThem}`}
                      >
                        <div className={styles.messageSender}>{senderName}</div>
                        <div className={styles.messageText}>{msg.message}</div>
                        <div className={styles.messageTime}>
                          {new Date(msg.created_at).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Input */}
                <div className={styles.replyBox}>
                  <textarea
                    className={styles.replyInput}
                    placeholder="Type your reply... (Press Enter to send, Shift+Enter for new line)"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={sending}
                    rows={3}
                  />
                  <button
                    className={styles.sendButton}
                    onClick={handleSendReply}
                    disabled={sending || !replyText.trim()}
                  >
                    {sending ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
