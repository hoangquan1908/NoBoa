-- Create board_strokes table
CREATE TABLE IF NOT EXISTS public.board_strokes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    points JSONB NOT NULL DEFAULT '[]'::jsonb,
    color TEXT,
    width FLOAT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for board_strokes
ALTER TABLE public.board_strokes ENABLE ROW LEVEL SECURITY;

-- Policies for board_strokes (through boards -> notes ownership)
CREATE POLICY "Users can view board_strokes of their boards" ON public.board_strokes FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.boards 
    JOIN public.notes ON boards.note_id = notes.id 
    WHERE boards.id = board_strokes.board_id AND notes.user_id = auth.uid()
));
CREATE POLICY "Users can insert board_strokes to their boards" ON public.board_strokes FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.boards 
    JOIN public.notes ON boards.note_id = notes.id 
    WHERE boards.id = board_strokes.board_id AND notes.user_id = auth.uid()
));
CREATE POLICY "Users can update board_strokes of their boards" ON public.board_strokes FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.boards 
    JOIN public.notes ON boards.note_id = notes.id 
    WHERE boards.id = board_strokes.board_id AND notes.user_id = auth.uid()
));
CREATE POLICY "Users can delete board_strokes of their boards" ON public.board_strokes FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.boards 
    JOIN public.notes ON boards.note_id = notes.id 
    WHERE boards.id = board_strokes.board_id AND notes.user_id = auth.uid()
));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_board_strokes_board_id ON public.board_strokes(board_id);
