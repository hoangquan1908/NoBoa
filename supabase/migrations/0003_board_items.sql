-- Create board_items table
CREATE TABLE IF NOT EXISTS public.board_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('photo', 'sticky_note', 'text_box')),
    content TEXT,
    image_url TEXT,
    pos_x FLOAT NOT NULL DEFAULT 0,
    pos_y FLOAT NOT NULL DEFAULT 0,
    rotation FLOAT NOT NULL DEFAULT 0,
    color TEXT,
    z_index INTEGER NOT NULL DEFAULT 0,
    locked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for board_items
ALTER TABLE public.board_items ENABLE ROW LEVEL SECURITY;

-- Policies for board_items (through boards -> notes ownership)
CREATE POLICY "Users can view board_items of their boards" ON public.board_items FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.boards 
    JOIN public.notes ON boards.note_id = notes.id 
    WHERE boards.id = board_items.board_id AND notes.user_id = auth.uid()
));
CREATE POLICY "Users can insert board_items to their boards" ON public.board_items FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.boards 
    JOIN public.notes ON boards.note_id = notes.id 
    WHERE boards.id = board_items.board_id AND notes.user_id = auth.uid()
));
CREATE POLICY "Users can update board_items of their boards" ON public.board_items FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.boards 
    JOIN public.notes ON boards.note_id = notes.id 
    WHERE boards.id = board_items.board_id AND notes.user_id = auth.uid()
));
CREATE POLICY "Users can delete board_items of their boards" ON public.board_items FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.boards 
    JOIN public.notes ON boards.note_id = notes.id 
    WHERE boards.id = board_items.board_id AND notes.user_id = auth.uid()
));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_board_items_board_id ON public.board_items(board_id);
