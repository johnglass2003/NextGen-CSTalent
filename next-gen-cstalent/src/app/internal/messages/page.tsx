

// --- Full-featured Messaging Page Implementation ---
'use client';
import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import styles from './messages.module.css';

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
  is_read: boolean;
  students?: { id: string; first_name: string; last_name: string; email: string } | null;
  companies?: { id: string; company_name: string; primary_contact_email: string } | null;
};

type Conversation = {
  conversation_id: string;
  subject: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  other_user: {
    id: string;
    name: string;
    email: string;
    role: 'student' | 'company';
    type: string;
  };
  messages: Message[];
};

export default function InternalMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

  useEffect(() => {
    fetchConversations();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (selectedConversation) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConversation?.messages]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          fetchConversations();
        }
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

      // Get the REAL user record from database
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

      // Fetch ALL messages for internal users
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          *,
          students (id, first_name, last_name, email),
          companies (id, company_name, primary_contact_email)
        `)
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

      // Group by conversation_id
      const conversationMap = new Map<string, Conversation>();

      messages.forEach(msg => {
        if (!conversationMap.has(msg.conversation_id)) {
          let otherUser = null;

          if (msg.student_id && msg.students) {
            otherUser = {
              id: msg.students.id,
              name: `${msg.students.first_name} ${msg.students.last_name}`,
              email: msg.students.email,
              role: 'student' as const,
              type: 'Student',
            };
          } else if (msg.company_id && msg.companies) {
            otherUser = {
              id: msg.companies.id,
              name: msg.companies.company_name,
              email: msg.companies.primary_contact_email || '',
              role: 'company' as const,
              type: 'Company',
            };
          }

          if (!otherUser) return;

          conversationMap.set(msg.conversation_id, {
            conversation_id: msg.conversation_id,
            subject: msg.subject || 'No Subject',
            last_message: msg.message,
            last_message_time: msg.created_at,
            unread_count: 0,
            other_user: otherUser,
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
      // Refresh to update unread counts
      fetchConversations();
    }
  }

  async function handleSendReply() {
    if (!replyText.trim() || !selectedConversation || !currentUserId) return;

    setSending(true);

    try {
      // Determine recipient and IDs based on other_user
      const otherUser = selectedConversation.other_user;
      const recipientId = otherUser.id;
      const newMessage = {
        sender_id: currentUserId,
        recipient_id: recipientId,
        student_id: otherUser.role === 'student' ? otherUser.id : null,
        company_id: otherUser.role === 'company' ? otherUser.id : null,
        subject: selectedConversation.subject,
        message: replyText.trim(),
        conversation_id: selectedConversation.conversation_id,
        is_read: false,
        archived: false,
      };

      const { error: insertError } = await supabase
        .from('messages')
        .insert([newMessage]);

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
      <ProtectedRoute allowedRoles={["internal"]}>
        <div className={styles.container}>
          <h1>Messages</h1>
          <p>Loading messages...</p>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute allowedRoles={["internal"]}>
        <div className={styles.container}>
          <h1>Messages</h1>
          <div className={styles.errorBox}>
            <strong>Error:</strong> {error}
          </div>
          <button
            onClick={() => (window.location.href = "/dev-login")}
            className={styles.button}
          >
            Back to Login
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["internal"]}>
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
                  Messages will appear here when students or companies contact you.
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
                    <span className={styles.icon}>
                      {conv.other_user.role === "student" ? "🎓" : "🏢"}
                    </span>
                    <span className={styles.userName}>{conv.other_user.name}</span>
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
                    <span className={styles.icon}>
                      {selectedConversation.other_user.role === "student" ? "🎓" : "🏢"}
                    </span>
                    <div>
                      <div className={styles.threadName}>
                        {selectedConversation.other_user.name}
                      </div>
                      <div className={styles.threadSubject}>
                        {selectedConversation.subject}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className={styles.messagesContainer}>
                  {selectedConversation.messages.map((msg, idx) => {
                    const isFromMe = msg.sender_id === currentUserId;
                    const senderName = isFromMe
                      ? 'You'
                      : selectedConversation.other_user.name;

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
