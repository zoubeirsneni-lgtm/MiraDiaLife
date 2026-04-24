import React from 'react';

export const Card = ({ children, className = "", hover = false, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`bg-[#F8FAFC] rounded-2xl p-5 border border-[#E2E8F0] transition-all ${hover ? 'hover:bg-[#E0F2FE] hover:border-[#7DD3FC]' : ''} ${className}`}
  >
    {children}
  </div>
);
