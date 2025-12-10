'use client';

import * as React from 'react';
import './tabs.css';

// Simple utility to merge class names
const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Simple tabs component without external dependencies
type TabsContextType = {
  value: string;
  onValueChange: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextType | null>(null);

type TabsProps = {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
};

const Tabs: React.FC<TabsProps> = ({ 
  defaultValue = '', 
  value: controlledValue, 
  onValueChange: controlledOnValueChange,
  className,
  children 
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  const onValueChange = isControlled ? controlledOnValueChange : setInternalValue;

  return (
    <TabsContext.Provider value={{ value: value || '', onValueChange: onValueChange || (() => {}) }}>
      <div data-slot="tabs" className={cn('', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

type TabsListProps = {
  className?: string;
  children: React.ReactNode;
  variant?: 'default' | 'button' | 'line';
  shape?: 'default' | 'pill';
  size?: 'lg' | 'md' | 'sm' | 'xs';
};

const TabsList: React.FC<TabsListProps> = ({ 
  className, 
  children,
  variant = 'default',
  shape = 'default',
  size = 'md'
}) => {
  const baseClasses = 'flex items-center shrink-0';
  const variantClasses = {
    default: 'bg-accent p-1',
    button: '',
    line: 'border-b border-border',
  };
  const sizeClasses = {
    lg: 'gap-2.5',
    md: 'gap-2',
    sm: 'gap-1.5',
    xs: 'gap-1',
  };
  const shapeClasses = shape === 'pill' ? 'rounded-full' : '';
  
  const classes = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    shapeClasses,
    className
  );

  return (
    <div data-slot="tabs-list" className={classes}>
      {children}
    </div>
  );
};

type TabsTriggerProps = {
  value: string;
  className?: string;
  children: React.ReactNode;
  variant?: 'default' | 'button' | 'line';
  size?: 'lg' | 'md' | 'sm' | 'xs';
};

const TabsTrigger: React.FC<TabsTriggerProps> = ({ 
  value, 
  className, 
  children,
  variant = 'default',
  size = 'md'
}) => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');
  
  const isActive = context.value === value;
  
  const baseClasses = 'shrink-0 cursor-pointer whitespace-nowrap inline-flex justify-center items-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
  
  const variantClasses = {
    default: isActive 
      ? 'text-foreground bg-background shadow-sm' 
      : 'text-muted-foreground hover:text-foreground',
    button: isActive
      ? 'bg-accent text-foreground'
      : 'text-accent-foreground hover:text-foreground',
    line: isActive
      ? 'border-b-2 border-primary text-primary'
      : 'border-b-2 border-transparent text-muted-foreground hover:text-primary',
  };
  
  const sizeClasses = {
    lg: 'gap-2.5 py-2.5 px-4 text-sm',
    md: 'gap-2 py-1.5 px-3 text-sm',
    sm: 'gap-1.5 py-1.5 px-2.5 text-xs',
    xs: 'gap-1 py-1 px-2 text-xs',
  };
  
  const shapeClasses = variant === 'default' && isActive ? 'rounded-md' : '';
  
  const classes = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    shapeClasses,
    className
  );

  return (
    <button
      data-slot="tabs-trigger"
      className={classes}
      onClick={() => context.onValueChange(value)}
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? 'active' : 'inactive'}
    >
      {children}
    </button>
  );
};

type TabsContentProps = {
  value: string;
  className?: string;
  children: React.ReactNode;
};

const TabsContent: React.FC<TabsContentProps> = ({ value, className, children }) => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');
  
  if (context.value !== value) return null;
  
  return (
    <div
      data-slot="tabs-content"
      className={cn('mt-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', className)}
    >
      {children}
    </div>
  );
};

export { Tabs, TabsContent, TabsList, TabsTrigger };

