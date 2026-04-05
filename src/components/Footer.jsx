import React from 'react';
import { Heart, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 py-12 mt-20">
      <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <h2 className="text-2xl font-black italic text-green-600 uppercase tracking-tighter">IngressoZ</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
            © 2024 • Sistema de Reservas Inteligente
          </p>
        </div>
        
        <a 
          href="https://linkpro.info/arlindosilva" 
          target="_blank" 
          rel="noopener noreferrer"
          className="group flex items-center gap-2 bg-slate-50 px-6 py-3 rounded-full border border-slate-100 hover:border-green-500 transition-all shadow-sm hover:shadow-md"
        >
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600">Desenvolvido por</span>
          <span className="text-sm font-black text-slate-900 group-hover:text-green-600 italic">Arlindo Silva</span>
          <Heart size={14} className="text-red-500 fill-red-500 animate-pulse" />
        </a>
      </div>
    </footer>
  );
}