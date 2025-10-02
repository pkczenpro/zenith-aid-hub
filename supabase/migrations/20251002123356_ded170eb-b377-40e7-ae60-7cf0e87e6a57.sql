-- Create chat sessions table to track all conversations
CREATE TABLE public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  message_count integer DEFAULT 0,
  resolved_by_ai boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create chat session messages table
CREATE TABLE public.chat_session_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create chat feedback table
CREATE TABLE public.chat_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  feedback_type text NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_session_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_sessions
CREATE POLICY "Users can view their own sessions"
  ON public.chat_sessions FOR SELECT
  USING (profile_id = get_current_profile());

CREATE POLICY "Users can insert their own sessions"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (profile_id = get_current_profile());

CREATE POLICY "Users can update their own sessions"
  ON public.chat_sessions FOR UPDATE
  USING (profile_id = get_current_profile());

CREATE POLICY "Admins can view all sessions"
  ON public.chat_sessions FOR SELECT
  USING (is_admin());

-- RLS Policies for chat_session_messages
CREATE POLICY "Users can view their own session messages"
  ON public.chat_session_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.chat_sessions
    WHERE chat_sessions.id = chat_session_messages.session_id
    AND chat_sessions.profile_id = get_current_profile()
  ));

CREATE POLICY "Users can insert their own session messages"
  ON public.chat_session_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chat_sessions
    WHERE chat_sessions.id = chat_session_messages.session_id
    AND chat_sessions.profile_id = get_current_profile()
  ));

CREATE POLICY "Admins can view all session messages"
  ON public.chat_session_messages FOR SELECT
  USING (is_admin());

-- RLS Policies for chat_feedback
CREATE POLICY "Users can view their own feedback"
  ON public.chat_feedback FOR SELECT
  USING (profile_id = get_current_profile());

CREATE POLICY "Users can insert their own feedback"
  ON public.chat_feedback FOR INSERT
  WITH CHECK (profile_id = get_current_profile());

CREATE POLICY "Admins can view all feedback"
  ON public.chat_feedback FOR SELECT
  USING (is_admin());

-- Create indexes for better performance
CREATE INDEX idx_chat_sessions_profile_id ON public.chat_sessions(profile_id);
CREATE INDEX idx_chat_sessions_product_id ON public.chat_sessions(product_id);
CREATE INDEX idx_chat_sessions_started_at ON public.chat_sessions(started_at);
CREATE INDEX idx_chat_session_messages_session_id ON public.chat_session_messages(session_id);
CREATE INDEX idx_chat_feedback_session_id ON public.chat_feedback(session_id);

-- Trigger for updating updated_at
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();