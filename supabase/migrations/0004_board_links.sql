-- Create board_links table
CREATE TABLE IF NOT EXISTS public.board_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    item_a_id UUID NOT NULL REFERENCES public.board_items(id) ON DELETE CASCADE,
    item_b_id UUID NOT NULL REFERENCES public.board_items(id) ON DELETE CASCADE,
    color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for board_links
ALTER TABLE public.board_links ENABLE ROW LEVEL SECURITY;

-- Policies for board_links (through boards -> notes ownership)
CREATE POLICY "Users can view board_links of their boards" ON public.board_links FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.boards 
    JOIN public.notes ON boards.note_id = notes.id 
    WHERE boards.id = board_links.board_id AND notes.user_id = auth.uid()
));
CREATE POLICY "Users can insert board_links to their boards" ON public.board_links FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.boards 
    JOIN public.notes ON boards.note_id = notes.id 
    WHERE boards.id = board_links.board_id AND notes.user_id = auth.uid()
));
CREATE POLICY "Users can update board_links of their boards" ON public.board_links FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.boards 
    JOIN public.notes ON boards.note_id = notes.id 
    WHERE boards.id = board_links.board_id AND notes.user_id = auth.uid()
));
CREATE POLICY "Users can delete board_links of their boards" ON public.board_links FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.boards 
    JOIN public.notes ON boards.note_id = notes.id 
    WHERE boards.id = board_links.board_id AND notes.user_id = auth.uid()
));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_board_links_board_id ON public.board_links(board_id);
