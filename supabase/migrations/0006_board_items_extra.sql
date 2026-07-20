-- Bổ sung cột lưu các thuộc tính riêng theo từng loại item
-- (StickyItem: w,h | ImageItem: w,h,caption | TextItem: fontSize)
-- Dùng JSONB thay vì thêm nhiều cột rời để linh hoạt khi thêm loại item mới sau này.
ALTER TABLE public.board_items
  ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'::jsonb;