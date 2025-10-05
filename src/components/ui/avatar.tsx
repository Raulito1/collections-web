import React from 'react';
import { cn } from '@/lib/utils';

type AvatarContextValue = {
  imageVisible: boolean;
  setImageVisible: (visible: boolean) => void;
};

const AvatarContext = React.createContext<AvatarContextValue | null>(null);

export type AvatarProps = React.HTMLAttributes<HTMLSpanElement>;

export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, children, ...props }, ref) => {
    const [imageVisible, setImageVisible] = React.useState(false);

    return (
      <AvatarContext.Provider value={{ imageVisible, setImageVisible }}>
        <span
          ref={ref}
          className={cn(
            'relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-200',
            className
          )}
          {...props}
        >
          {children}
        </span>
      </AvatarContext.Provider>
    );
  }
);
Avatar.displayName = 'Avatar';

export type AvatarImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

export const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, onError, onLoad, src, ...props }, ref) => {
    const context = React.useContext(AvatarContext);

    React.useEffect(() => {
      if (!src) {
        context?.setImageVisible(false);
      }
    }, [src, context]);

    return (
      <img
        ref={ref}
        src={src}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-200',
          context?.imageVisible ? 'opacity-100' : 'opacity-0',
          className
        )}
        onLoad={(event) => {
          context?.setImageVisible(true);
          onLoad?.(event);
        }}
        onError={(event) => {
          context?.setImageVisible(false);
          onError?.(event);
        }}
        {...props}
      />
    );
  }
);
AvatarImage.displayName = 'AvatarImage';

export type AvatarFallbackProps = React.HTMLAttributes<HTMLSpanElement>;

export const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallbackProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(AvatarContext);

    return (
      <span
        ref={ref}
        className={cn(
          'absolute inset-0 flex items-center justify-center bg-slate-200 text-sm font-medium text-slate-700',
          context?.imageVisible ? 'invisible opacity-0' : 'visible opacity-100',
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);
AvatarFallback.displayName = 'AvatarFallback';
