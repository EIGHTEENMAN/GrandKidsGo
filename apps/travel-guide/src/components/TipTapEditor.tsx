'use client';

import { forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

type TipTapEditorProps = {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

// 2026-07-31 v1.0 Phase C：暴露给父组件的 imperative API
// 用法：const ref = useRef<TipTapEditorHandle>(null);
//       ref.current?.insertContent('<p>...</p>');
export type TipTapEditorHandle = {
  insertContent: (html: string) => void;
  focus: () => void;
  getHTML: () => string;
};

const TipTapEditor = forwardRef<TipTapEditorHandle, TipTapEditorProps>(function TipTapEditor(
  { content, onChange, placeholder },
  ref,
) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder || '开始写内容...' }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3' },
    },
  });

  useImperativeHandle(ref, () => ({
    insertContent: (html: string) => {
      if (!editor) return;
      editor.chain().focus().insertContent(html).run();
    },
    focus: () => {
      editor?.chain().focus().run();
    },
    getHTML: () => editor?.getHTML() ?? '',
  }), [editor]);

  if (!editor) return null;

  const addLink = () => {
    const url = prompt('输入链接地址:');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className="border rounded-xl overflow-hidden bg-white">
      <div className="flex flex-wrap gap-0.5 border-b bg-gray-50 px-2 py-1.5">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} label="B" />
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} label="I" className="italic" />
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} label="U" className="underline" />
        <span className="w-px bg-gray-300 mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} label="H2" />
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} label="H3" />
        <span className="w-px bg-gray-300 mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} label="•列表" />
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} label="1.列表" />
        <span className="w-px bg-gray-300 mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} label="引用" />
        <ToolBtn onClick={addLink} active={editor.isActive('link')} label="🔗链接" />
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} label="↩" />
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} label="↪" />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
});

export default TipTapEditor;

function ToolBtn({ onClick, active, label, className }: { onClick: () => void; active?: boolean; label: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 text-sm rounded transition-colors ${active ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-200'} ${className || ''}`}
    >
      {label}
    </button>
  );
}
