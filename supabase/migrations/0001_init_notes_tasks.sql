-- Create notes table
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Policies for notes
CREATE POLICY "Users can view their own notes" ON public.notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own notes" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notes" ON public.notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notes" ON public.notes FOR DELETE USING (auth.uid() = user_id);

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    is_done BOOLEAN NOT NULL DEFAULT false,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policies for tasks (through notes ownership)
CREATE POLICY "Users can view tasks of their notes" ON public.tasks FOR SELECT USING (EXISTS (SELECT 1 FROM public.notes WHERE notes.id = tasks.note_id AND notes.user_id = auth.uid()));
CREATE POLICY "Users can insert tasks to their notes" ON public.tasks FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.notes WHERE notes.id = tasks.note_id AND notes.user_id = auth.uid()));
CREATE POLICY "Users can update tasks of their notes" ON public.tasks FOR UPDATE USING (EXISTS (SELECT 1 FROM public.notes WHERE notes.id = tasks.note_id AND notes.user_id = auth.uid()));
CREATE POLICY "Users can delete tasks of their notes" ON public.tasks FOR DELETE USING (EXISTS (SELECT 1 FROM public.notes WHERE notes.id = tasks.note_id AND notes.user_id = auth.uid()));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_note_id ON public.tasks(note_id);
