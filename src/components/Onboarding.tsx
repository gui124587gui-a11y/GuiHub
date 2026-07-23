import { useState } from 'react';
import { ArrowRight, Check, ListFilter, Search, Zap } from 'lucide-react';

const steps = [
  { icon: Zap, title: 'Bem-vindo ao AnthonyHub', text: 'Seu espaço rápido para organizar tarefas, atalhos e ferramentas do dia a dia.' },
  { icon: ListFilter, title: 'Veja o que pesa no PC', text: 'Abra “Processos pesados” para descobrir quais programas estão consumindo mais CPU e memória.' },
  { icon: Search, title: 'Encontre tudo rapidamente', text: 'Use a busca no topo para navegar pelas funções do hub sem perder tempo.' },
];

export default function Onboarding({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const item = steps[step];
  const Icon = item.icon;
  const last = step === steps.length - 1;

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-5">
    <section className="w-full max-w-lg rounded-3xl border border-primary bg-card p-8 shadow-[0_0_45px_rgba(255,0,0,.35)]">
      <div className="mb-8 flex gap-2">{steps.map((_, index) => <span key={index} className={`h-1.5 flex-1 rounded ${index <= step ? 'bg-primary' : 'bg-white/15'}`} />)}</div>
      <div className="mb-6 inline-flex rounded-2xl bg-primary/15 p-4 text-primary"><Icon size={34} /></div>
      <h2 className="text-2xl font-bold text-white">{item.title}</h2>
      <p className="mt-3 min-h-14 text-textSecondary">{item.text}</p>
      <div className="mt-8 flex justify-between gap-3">
        <button onClick={onFinish} className="rounded-xl px-4 py-3 text-sm text-textSecondary hover:text-white">Pular tutorial</button>
        <button onClick={() => last ? onFinish() : setStep(step + 1)} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-secondary">
          {last ? <><Check size={18} /> Começar</> : <>Próximo <ArrowRight size={18} /></>}
        </button>
      </div>
    </section>
  </div>;
}
