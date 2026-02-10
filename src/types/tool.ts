export type ToolCategory = 'pdf' | 'image' | 'doc';

export interface ToolMeta {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  path: string;
  icon: string;
  acceptedTypes: string[];
}

export interface CategoryMeta {
  id: ToolCategory;
  name: string;
  description: string;
  path: string;
  icon: string;
  color: string;
}
