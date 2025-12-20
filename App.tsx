
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import ResultDisplay from './components/ResultDisplay';
import { extractLabData } from './services/geminiService';
import { AppStatus, ExtractionResponse } from './types';

// The AIStudio global declarations are already provided by the environment.
// Removing redundant definitions to fix 'Duplicate identifier' and modifier mismatch errors.

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [data, setData] = useState<ExtractionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    checkInitialAuth();
  }, []);

  const checkInitialAuth = async () => {
    // 1. Verifica se a chave já foi injetada pelo servidor (ex: Vercel)
    const envKey = process.env.API_KEY;
    if (envKey && envKey !== "undefined" && envKey.length > 5) {
      setHasKey(true);
      return;
    }

    // 2. Se não houver chave no env, verifica o seletor do AI Studio (Google Cloud)
    try {
      // @ts-ignore - window.aistudio is globally defined in the environment
      if (window.aistudio) {
        // @ts-ignore
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        // Se estiver fora do ambiente que provê aistudio e sem env key
        setHasKey(false);
      }
    } catch (e) {
      setHasKey(false);
    }
  };

  const handleSelectKey = async () => {
    // @ts-ignore
    if (window.aistudio) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      // Assume success after triggering the dialog as per guidelines to avoid race condition
      setHasKey(true);
    } else {
      setError("Ambiente de configuração de chave indisponível. Configure a variável API_KEY no seu servidor.");
    }
  };

  const handleFileSelect = async (file: File) => {
    setFileName(file.name);
    setStatus(AppStatus.LOADING);
    setError(null);
    setData(null);

    try {
      const result = await extractLabData(file);
      setData(result);
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      if (err.message === "AUTH_REQUIRED") {
        setHasKey(false);
        setError("A autenticação falhou. Por favor, conecte sua chave novamente.");
      } else {
        setError(err.message || 'Erro inesperado ao processar o arquivo.');
      }
      setStatus(AppStatus.ERROR);
    }
  };

  const reset = () => {
    setStatus(AppStatus.IDLE);
    setData(null);
    setError(null);
    setFileName(null);
  };

  if (hasKey === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Configuração Necessária</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Para processar exames, o app precisa de uma chave de API do Gemini. Você pode conectar sua conta Google Cloud ou configurar o servidor.
          </p>
          <button
            onClick={handleSelectKey}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all mb-4"
          >
            Conectar com Google Cloud
          </button>
          <div className="text-xs text-slate-400 space-y-2">
            <p>Se você é o administrador, adicione a variável <code>API_KEY</code> no painel da Vercel.</p>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block hover:text-indigo-600 underline"
            >
              Documentação de faturamento
            </a>
          </div>
        </div>
      </div>
    );
  }

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
                <p className="font-semibold mb-1">Como funciona:</p>
                <p>Carregue seu PDF ou imagem de exame. O sistema extrairá apenas o nome do parâmetro e o valor numérico. Nenhuma interpretação médica será feita.</p>
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
            {fileName && <p className="mt-4 text-xs bg-slate-200 px-3 py-1 rounded text-slate-600">{fileName}</p>}
          </div>
        )}

        {status === AppStatus.ERROR && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-red-800">Ocorreu um erro</h3>
            <p className="text-red-600 mt-2 max-w-md mx-auto">{error}</p>
            <div className="flex gap-4 justify-center mt-6">
              <button onClick={reset} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm">Tentar Novamente</button>
              <button onClick={handleSelectKey} className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors shadow-sm text-sm">Alterar Chave</button>
            </div>
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
