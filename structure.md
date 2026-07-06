note-board-app/
├── apps/
│   └── web/                          # Frontend React/Vite
│       ├── src/
│       │   ├── assets/               # icon, font, ảnh tĩnh
│       │   ├── components/
│       │   │   ├── common/           # Button, Modal, Dropdown...
│       │   │   ├── sidebar/          # SidebarList, NoteItem, NewNoteButton
│       │   │   ├── todo/             # TaskList, TaskItem, ProgressBar, TaskFilter
│       │   │   ├── board/
│       │   │   │   ├── BoardCanvas.tsx        # canvas chính, xử lý zoom/pan
│       │   │   │   ├── BoardToolbar.tsx       # thanh công cụ vẽ/nối dây/undo
│       │   │   │   ├── items/
│       │   │   │   │   ├── PhotoItem.tsx
│       │   │   │   │   ├── StickyNoteItem.tsx
│       │   │   │   │   └── TextBoxItem.tsx
│       │   │   │   ├── DrawingLayer.tsx       # lớp vẽ tay (SVG/canvas riêng)
│       │   │   │   ├── StringLinks.tsx        # SVG nối dây giữa các item
│       │   │   │   ├── Lightbox.tsx           # xem ảnh phóng to
│       │   │   │   ├── BoardTabs.tsx          # quản lý nhiều board/1 note
│       │   │   │   └── Minimap.tsx
│       │   │   └── layout/           # AppShell, Header, PanelSplit
│       │   ├── hooks/
│       │   │   ├── useAutosave.ts
│       │   │   ├── useUndoRedo.ts
│       │   │   ├── useBoardCanvas.ts # pan/zoom logic
│       │   │   ├── useDrag.ts
│       │   │   └── useSupabaseSync.ts
│       │   ├── lib/
│       │   │   ├── supabaseClient.ts
│       │   │   └── indexedDb.ts      # cache local trước khi sync
│       │   ├── store/                # Zustand store
│       │   │   ├── notesStore.ts
│       │   │   ├── todoStore.ts
│       │   │   └── boardStore.ts     # items, links, drawing strokes, viewport
│       │   ├── types/
│       │   │   ├── note.types.ts
│       │   │   ├── task.types.ts
│       │   │   └── board.types.ts    # BoardItem, StringLink, Stroke...
│       │   ├── pages/
│       │   │   ├── NotePage.tsx
│       │   │   └── SharedBoardPage.tsx  # (nếu sau này hỗ trợ share link)
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── public/
│       ├── index.html
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       └── package.json
│
├── supabase/                          # Backend (Supabase project)
│   ├── migrations/
│   │   ├── 0001_init_notes_tasks.sql
│   │   ├── 0002_boards.sql            # bảng boards (nhiều board/note)
│   │   ├── 0003_board_items.sql       # ảnh, note, textbox (vị trí, xoay, màu...)
│   │   ├── 0004_board_links.sql       # cặp nối dây (item_a, item_b, color)
│   │   └── 0005_board_strokes.sql     # nét vẽ tay (points, color, width, board_id)
│   ├── functions/                     # Edge Functions (nếu cần xử lý phía server)
│   │   ├── export-board-png/          # xuất board ra ảnh
│   │   └── generate-share-link/       # tạo link chia sẻ board
│   ├── seed.sql
│   └── config.toml
│
├── packages/                          # (tuỳ chọn) code dùng chung nếu mở rộng sau
│   └── shared-types/
│       └── index.ts                   # type dùng chung giữa web & functions
│
├── .env.example
├── package.json                       # workspace root (npm/pnpm workspaces)
├── pnpm-workspace.yaml
└── README.md