// Stub for next/link — renders a plain <a> tag in preview environments
import React from 'react';
export default function Link({ href, children, className, ...props }) {
  return React.createElement('a', { href, className, ...props }, children);
}
