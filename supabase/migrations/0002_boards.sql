-- Create boards table
CREATE TABLE IF NOT EXISTS public.boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Untitled Board',
    viewport_x FLOAT NOT NULL DEFAULT 0,
    viewport_y FLOAT NOT NULL DEFAULT 0,
    viewport_zoom FLOAT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for boards
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

-- Policies for boards (through notes ownership)
CREATE POLICY "Users can view boards of their notes" ON public.boards FOR SELECT USING (EXISTS (SELECT 1 FROM public.notes WHERE notes.id = boards.note_id AND notes.user_id = auth.uid()));
CREATE POLICY "Users can insert boards to their notes" ON public.boards FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.notes WHERE notes.id = boards.note_id AND notes.user_id = auth.uid()));
CREATE POLICY "Users can update boards of their notes" ON public.boards FOR UPDATE USING (EXISTS (SELECT 1 FROM public.notes WHERE notes.id = boards.note_id AND notes.user_id = auth.uid()));
CREATE POLICY "Users can delete boards of their notes" ON public.boards FOR DELETE USING (EXISTS (SELECT 1 FROM public.notes WHERE notes.id = boards.note_id AND notes.user_id = auth.uid()));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_boards_note_id ON public.boards(note_id);
