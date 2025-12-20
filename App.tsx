
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import ResultDisplay from './components/ResultDisplay';
import { extractLabData } from './services/geminiService';
import { AppStatus, ExtractionResponse } from './types';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [data, setData] = useState<ExtractionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showKeyHelp, setShowKeyHelp] = useState(false);

  const handleFileSelect = async (file: File) => {
    setFileName(file.name);
    setStatus(AppStatus.LOADING);
    setError(null);
    setData(null);
    setShowKeyHelp(false);

    try {
      const result = await extractLabData(file);
      setData(result);
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setStatus(AppStatus.ERROR);
      
      if (err.message?.includes("API_KEY_MISSING") || err.message?.includes("401") || err.message?.includes("403")) {
        setError("Chave de API não configurada ou inválida.");
        setShowKeyHelp(true);
      } else {
        setError(err.message || 'Erro inesperado ao processar o arquivo.');
      }
    }
  };

  const reset = () => {
    setStatus(AppStatus.IDLE);
    setData(null);
    setError(null);
    setFileName(null);
    setShowKeyHelp(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Header />
      <main className="max-w-4xl mx-auto px-4">
        {status === AppStatus.IDLE && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 mb-8 flex items-start gap-4">
              <div className="text-indigo-600 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-sm text-indigo-800 leading-relaxed">
                <p className="font-semibold mb-1">Pronto para começar:</p>
                <p>Carregue seu PDF ou imagem de exame para extrair os resultados numéricos automaticamente.</p>
              </div>
            </div>
            <FileUpload onFileSelect={handleFileSelect} />
          </div>
        )}

        {status === AppStatus.LOADING && (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="relative mb-8">
               <div className="w-20 h-20 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
               </div>
            </div>
            <h3 className="text-lg font-medium text-slate-700">Analisando documento...</h3>
            <p className="text-sm text-slate-500 mt-2">Isso pode levar alguns segundos.</p>
          </div>
        )}

        {status === AppStatus.ERROR && (
          <div className="bg-white border border-red-100 rounded-2xl shadow-xl p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800">Ops! Algo deu errado</h3>
            <p className="text-slate-600 mt-2 mb-8">{error}</p>
            
            {showKeyHelp && (
              <div className="bg-slate-50 rounded-xl p-6 mb-8 text-left border border-slate-200">
                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Como resolver na Vercel:
                </h4>
                <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                  <li>Vá ao seu projeto no Dashboard da <strong>Vercel</strong>.</li>
                  <li>Clique em <strong>Settings</strong> &gt; <strong>Environment Variables</strong>.</li>
                  <li>Adicione uma variável com a chave <code>API_KEY</code>.</li>
                  <li>Cole o valor da sua chave do Gemini.</li>
                  <li>Faça um novo <strong>Redeploy</strong> do projeto.</li>
                </ol>
              </div>
            )}

            <button 
              onClick={reset} 
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {status === AppStatus.SUCCESS && data && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <button onClick={reset} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                  <h2 className="text-lg font-semibold text-slate-800 truncate max-w-xs">{fileName}</h2>
               </div>
               <button onClick={reset} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">Novo exame</button>
            </div>
            <ResultDisplay data={data} />
          </div>
        )}
      </main>
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-4 px-6 text-center">
        <p className="text-xs text-slate-400">Nota: Esta ferramenta extrai apenas dados. <strong>Nenhum diagnóstico é fornecido.</strong></p>
      </footer>
    </div>
  );
};

export default App;
