declare module 'react-files' {
  import { Component } from 'react';

  export interface ReactFilesFile extends File {
    id: string;
    preview?: {
      type: string;
      url: string;
    };
    extension?: string;
  }

  export interface ReactFilesError {
    code: number;
    message: string;
  }

  export interface FilesProps {
    className?: string;
    dragActiveClassName?: string;
    accepts?: string[];
    onChange: (files: ReactFilesFile[]) => void;
    onError?: (error: ReactFilesError, file: File) => void;
    multiple?: boolean;
    maxFiles?: number;
    maxFileSize?: number;
    minFileSize?: number;
    clickable?: boolean;
    children?: React.ReactNode;
    inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  }

  export default class Files extends Component<FilesProps> {}
}

declare module 'react-singleton-hook' {
  export function singletonHook<T>(
    initialState: T,
    hook: () => T
  ): () => T;
}
