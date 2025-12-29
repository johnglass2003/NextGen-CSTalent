'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ProtectedRoute } from '@/components/auth';
import { CompanyNav } from '@/components/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
import styles from './page.module.css';

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
  company_id?: string;
};

type Conversation = {
  conversation_id: string;
  subject: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  messages: Message[];
};

export default function CompanyMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  useEffect(() => {
    fetchConversations();
    
    // Set up real-time subscription for new messages
    const channel = supabase
      .channel('company-messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages load
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  async function fetchConversations() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUserId(user.id);

    // Get company record
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!company) {
      setLoading(false);
      return;
    }

    setCompanyId(company.id);

    // Fetch messages where company is involved
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('company_id', company.id)
      .eq('archived', false)
      .order('created_at', { ascending: true });

    if (!messages) {
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
      
      // Count unread messages
      if (!msg.is_read && msg.recipient_id === user.id) {
        conv.unread_count++;
      }
    });

    // Convert map to array and sort by last message time
    const conversationsArray = Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());

    setConversations(conversationsArray);
    
    // If a conversation is selected, update it with new messages
    if (selectedConversation) {
      const updated = conversationsArray.find(c => c.conversation_id === selectedConversation.conversation_id);
      if (updated) {
        setSelectedConversation(updated);
        markConversationAsRead(updated.conversation_id);
      }
    }

    setLoading(false);
  }

  async function markConversationAsRead(conversationId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('recipient_id', user.id)
      .eq('is_read', false);

    fetchConversations();
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !companyId) return;

    // Get internal team user (for recipient_id) - from the conversation
    // The recipient should be whoever sent the other messages (internal team)
    const internalUserId = selectedConversation.messages.find(
      m => m.sender_id !== user.id
    )?.sender_id;

    if (!internalUserId) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: selectedConversation.conversation_id,
        sender_id: user.id,
        recipient_id: internalUserId,
        company_id: companyId,
        subject: selectedConversation.subject,
        message: newMessage,
        is_read: false,
        archived: false,
      });

    if (!error) {
      setNewMessage('');
      fetchConversations();
    }
  }

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['company']}>
        <CompanyNav />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading messages...</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['company']}>
      <CompanyNav />
      <div className={styles.messagesPage}>
        {/* Header */}
        <div className={styles.messagesHeader}>
          <div className={styles.headerLeft}>
            <h1>Messages</h1>
            {totalUnread > 0 && (
              <span className={styles.unreadBadge}>{totalUnread} unread</span>
            )}
          </div>
          <button 
            className={styles.newMessageBtn}
            onClick={() => setShowNewMessageModal(true)}
          >
            + Contact Support
          </button>
        </div>

        <p className={styles.helpText}>Contact the NextGen CS Talent team for assistance with hiring, requirements, or general inquiries</p>

        {/* Split View Layout */}
        <div className={styles.messagesLayout}>
          
          {/* Left: Conversations List */}
          <div className={styles.conversationsPanel}>
            <div className={styles.panelHeader}>
              <h3>Conversations</h3>
            </div>

            {/* Conversations List */}
            <div className={styles.conversationsList}>
              {conversations.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No messages yet</p>
                  <p className={styles.emptySubtext}>Start a conversation with our team</p>
                </div>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.conversation_id}
                    className={`${styles.conversationItem} ${selectedConversation?.conversation_id === conv.conversation_id ? styles.selected : ''} ${conv.unread_count > 0 ? styles.unread : ''}`}
                    onClick={() => {
                      setSelectedConversation(conv);
                      markConversationAsRead(conv.conversation_id);
                    }}
                  >
                    <div className={styles.conversationHeader}>
                      <div className={styles.conversationName}>
                        🏛️ NextGen CS Talent
                      </div>
                      {conv.unread_count > 0 && (
                        <span className={styles.unreadDot}>{conv.unread_count}</span>
                      )}
                    </div>
                    <div className={styles.conversationSubject}>{conv.subject}</div>
                    <div className={styles.conversationPreview}>
                      {conv.last_message.substring(0, 60)}
                      {conv.last_message.length > 60 ? '...' : ''}
                    </div>
                    <div className={styles.conversationTime}>
                      {formatMessageTime(conv.last_message_time)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Message Thread */}
          <div className={styles.messageThreadPanel}>
            {selectedConversation ? (
              <>
                {/* Thread Header */}
                <div className={styles.threadHeader}>
                  <div>
                    <h2>{selectedConversation.subject}</h2>
                    <p className={styles.threadMeta}>
                      With: <strong>NextGen CS Talent Support</strong>
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className={styles.messagesContainer}>
                  {selectedConversation.messages.map(msg => {
                    const isSentByMe = msg.sender_id === currentUserId;

                    return (
                      <div
                        key={msg.id}
                        className={`${styles.messageBubble} ${isSentByMe ? styles.sent : styles.received}`}
                      >
                        <div className={styles.messageContent}>{msg.message}</div>
                        <div className={styles.messageTime}>
                          {new Date(msg.created_at).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Input */}
                <form onSubmit={handleSendMessage} className={styles.replyForm}>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    rows={3}
                    className={styles.replyInput}
                  />
                  <button type="submit" className={styles.sendBtn} disabled={!newMessage.trim()}>
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div className={styles.emptyStateThread}>
                <div className={styles.emptyIcon}>💬</div>
                <p>Select a conversation to view messages</p>
                <p className={styles.emptySubtext}>or start a new conversation with our team</p>
              </div>
            )}
          </div>
        </div>

        {/* New Message Modal */}
        {showNewMessageModal && (
          <NewMessageModal
            companyId={companyId}
            onClose={() => setShowNewMessageModal(false)}
            onSent={() => {
              setShowNewMessageModal(false);
              fetchConversations();
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

// New Message Modal Component - Companies can only message internal team
function NewMessageModal({ 
  companyId, 
  onClose, 
  onSent 
}: { 
  companyId: string | null;
  onClose: () => void; 
  onSent: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('general');
  const [sending, setSending] = useState(false);
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    setSending(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get internal team user (for recipient_id)
    const { data: internalUser } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'internal')
      .limit(1)
      .single();

    if (!internalUser) {
      alert('Unable to find support team. Please try again later.');
      setSending(false);
      return;
    }

    // Generate a new conversation_id
    const conversationId = crypto.randomUUID();

    // Prefix subject with message type
    const fullSubject = messageType !== 'general' 
      ? `[${messageType.charAt(0).toUpperCase() + messageType.slice(1)}] ${subject}`
      : subject;

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        recipient_id: internalUser.id,
        company_id: companyId,
        subject: fullSubject,
        message: message,
        is_read: false,
        archived: false,
      });

    if (!error) {
      onSent();
    } else {
      alert('Failed to send message. Please try again.');
    }
    setSending(false);
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2>Contact Support</h2>
        <p className={styles.modalSubtext}>Send a message to the NextGen CS Talent team</p>
        
        <form onSubmit={handleSend}>
          <div className={styles.formGroup}>
            <label>Topic</label>
            <select
              value={messageType}
              onChange={(e) => setMessageType(e.target.value)}
              className={styles.selectInput}
            >
              <option value="general">General Inquiry</option>
              <option value="hiring">Hiring & Candidates</option>
              <option value="requirements">Job Requirements</option>
              <option value="billing">Billing & Account</option>
              <option value="technical">Technical Support</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              placeholder="What can we help you with?"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={6}
              placeholder="Type your message..."
            />
          </div>

          <div className={styles.modalActions}>
            <button type="submit" className={styles.sendBtn} disabled={sending}>
              {sending ? 'Sending...' : 'Send Message'}
            </button>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper function
function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
