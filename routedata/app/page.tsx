'use client';

import React, { useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import ErrorBoundary from '@/components/ErrorBoundary';
import SideNav, { type AppPage } from '@/components/nav/SideNav';
import Header from '@/components/ui/Header';
import StepSourceTable from '@/components/workflow/StepSourceTable';

/** ACK / Lit modules touch `window` at import time — skip SSR for this step. */
const StepDashboardBuilder = dynamic(() => import('@/components/workflow/StepDashboardBuilder'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center p-12 bg-gray-50/50">
      <div className="flex flex-col items-center gap-3 text-sm text-gray-500">
        <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        Loading workbook editor…
      </div>
    </div>
  ),
});

import LoadWorkbookDialog from '@/components/workbook/LoadWorkbookDialog';
import SaveWorkbookDialog from '@/components/workbook/SaveWorkbookDialog';
import HomePage from '@/components/pages/HomePage';
import DashboardsPage from '@/components/pages/DashboardsPage';
import DataSourcesPage from '@/components/pages/DataSourcesPage';
import TargetsPage from '@/components/pages/TargetsPage';
import SettingsPage from '@/components/pages/SettingsPage';
import { useAuth } from '@/hooks/useAuth';
import { useWorkbook } from '@/hooks/useWorkbook';
import { usePlatformData } from '@/hooks/usePlatformData';
import { getDefaultDatasetId } from '@/lib/services/luzmo-service';
import { deleteWorkbookDefinition, loadWorkbookDefinitions } from '@/lib/services/workbook-service';
import { DevStackLabelsProvider } from '@/components/dev/DevStackLabelsProvider';
import { DevStackLabelsFloatingToggle } from '@/components/dev/DevStackLabelsFloatingToggle';

type WorkflowStep = 'source-table' | 'dashboard';

export default function Home() {
  const { auth, status } = useAuth();
  const wb = useWorkbook();
  const defaultDatasetId = getDefaultDatasetId();
  const { data: platformData, loading: platformLoading } = usePlatformData();

  const [page, setPage] = useState<AppPage>('home');
  const [step, setStep] = useState<WorkflowStep>('source-table');
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const datasetId = wb.workbook.sourceTable.datasetId || defaultDatasetId;
  const homeDatasetId = platformData?.dataset.id || defaultDatasetId;
  const authKey = auth.authKey;
  const authToken = auth.authToken;

  const selectedFieldIds = useMemo(
    () => wb.selectedFields.map((f) => f.id),
    [wb.selectedFields]
  );

  const handleDeleteWorkbook = useCallback(
    (id: string) => {
      deleteWorkbookDefinition(id);
      wb.refreshSavedList();
    },
    [wb]
  );

  const handleNavigate = useCallback(
    (target: AppPage) => {
      if (target === 'dashboards') wb.refreshSavedList();
      setPage(target);
    },
    [wb]
  );

  const handleLoadWorkbook = useCallback(
    (id: string) => {
      wb.loadWorkbook(id);
      setPage('reporting');
      const found = loadWorkbookDefinitions().find((w) => w.id === id);
      if (found && found.sourceTable.selectedFields.length > 0) {
        setStep('dashboard');
      }
    },
    [wb]
  );

  const handleReportingStepChange = useCallback(
    (s: WorkflowStep) => {
      if (s === 'dashboard' && wb.selectedFields.length === 0) return;
      setStep(s);
    },
    [wb.selectedFields.length]
  );

  return (
    <ErrorBoundary>
      <DevStackLabelsProvider>
        <div className="flex h-screen bg-gray-50/50">
          <SideNav currentPage={page} onNavigate={handleNavigate} />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="h-0.5 bg-gradient-to-r from-green-500 via-green-400 to-emerald-400 flex-shrink-0" />

            {page === 'reporting' && (
              <>
                <Header
                  connected={status.connected}
                  workbookName={wb.workbook.name}
                  currentStep={step}
                  onStepChange={handleReportingStepChange}
                  canGoToDashboard={wb.selectedFields.length > 0}
                  onNewWorkbook={() => {
                    wb.newWorkbook();
                    setStep('source-table');
                  }}
                  onSaveWorkbook={() => setShowSaveDialog(true)}
                  onLoadWorkbook={() => {
                    wb.refreshSavedList();
                    setShowLoadDialog(true);
                  }}
                />

                {step === 'source-table' && (
                  <StepSourceTable
                    authKey={authKey}
                    authToken={authToken}
                    authLoading={false}
                    datasetId={datasetId}
                    selectedFieldIds={selectedFieldIds}
                    selectedFields={wb.selectedFields}
                    sorts={wb.sorts}
                    onFieldSelectionChanged={wb.setSelectedFields}
                    onDatasetNameResolved={wb.setDatasetName}
                    onSortChange={wb.setSorts}
                    onContinue={() => setStep('dashboard')}
                  />
                )}

                {step === 'dashboard' && (
                  <StepDashboardBuilder
                    authKey={authKey}
                    authToken={authToken}
                    datasetId={datasetId}
                    datasetName={wb.workbook.sourceTable.datasetName || ''}
                    embedReadyForDataset
                    embedKey={authKey}
                    selectedFields={wb.selectedFields}
                    canvasItems={wb.workbook.canvasItems}
                    filters={wb.filters}
                    sorts={wb.sorts}
                    onAddCanvasItem={wb.addCanvasItem}
                    onAddCanvasItemsBatch={wb.addCanvasItemsBatch}
                    onRemoveCanvasItem={wb.removeCanvasItem}
                    onUpdateCanvasItem={wb.updateCanvasItem}
                    onSetFilters={wb.setFilters as (filters: unknown[]) => void}
                    onLayoutChange={wb.updateCanvasLayout}
                    onDatasetChanged={wb.setDatasetId}
                    onBack={() => setStep('source-table')}
                  />
                )}
              </>
            )}

            {page === 'home' && (
              <HomePage
                onNavigate={handleNavigate}
                connected={status.connected}
                platformData={platformData}
                authKey={authKey}
                authToken={authToken}
                datasetId={homeDatasetId}
              />
            )}

            {page === 'dashboards' && (
              <DashboardsPage
                onNavigate={handleNavigate}
                savedWorkbooks={wb.savedWorkbooks}
                onLoadWorkbook={handleLoadWorkbook}
                onDeleteWorkbook={handleDeleteWorkbook}
              />
            )}

            {page === 'data-sources' && <DataSourcesPage />}

            {page === 'targets' && (
              <TargetsPage targets={platformData?.targets ?? []} loading={platformLoading} />
            )}

            {page === 'settings' && <SettingsPage connected={status.connected} />}
          </div>

          <LoadWorkbookDialog
            open={showLoadDialog}
            workbooks={wb.savedWorkbooks}
            onLoad={(id) => {
              handleLoadWorkbook(id);
              setShowLoadDialog(false);
            }}
            onClose={() => setShowLoadDialog(false)}
            onDelete={handleDeleteWorkbook}
          />
          <SaveWorkbookDialog
            open={showSaveDialog}
            initialName={wb.workbook.name}
            initialDescription={wb.workbook.description || ''}
            onSave={({ name, description }) => {
              wb.saveWorkbook({ name, description });
              setShowSaveDialog(false);
            }}
            onClose={() => setShowSaveDialog(false)}
          />

          <DevStackLabelsFloatingToggle />
        </div>
      </DevStackLabelsProvider>
    </ErrorBoundary>
  );
}
