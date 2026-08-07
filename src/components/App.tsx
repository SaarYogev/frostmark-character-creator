import React, { useState, useEffect, useRef } from 'react';
import { CharacterProvider, useCharacter } from '../contexts/CharacterContext';
import { Layout } from './Layout';
import { HomePage } from './HomePage';
import IdentityForm from './IdentityForm';
import RaceSelector from './RaceSelector';
import BackgroundSelector from './BackgroundSelector';
import AbilityScoreSelector from './AbilityScoreSelector';
import AOSelector from './AOSelector';
import SkillsSelector from './SkillsSelector';
import ProficienciesSelector from './ProficienciesSelector';
import SpellSlotsSelector from './SpellSlotsSelector';
import SpellsSelector from './SpellsSelector';
import EquipmentSelector from './EquipmentSelector';
import FinishingTouches from './FinishingTouches';
import { CharacterState, DEFAULT_CHARACTER } from '../types/Character';
import { SavedCharacterMeta, StorageStatus } from '../services/storage/types';
import { saveCharacterLocally, saveDraftLocally, deleteLocalCharacter } from '../services/storage/localStorageService';
import { isGoogleSignedIn, saveToDriveAppData } from '../services/storage/googleDriveService';

function BuilderContent({
  currentStep,
  onNavigate,
  onNavigateHome,
  activeMeta,
  setActiveMeta,
}: {
  currentStep: number;
  onNavigate: (step: number) => void;
  onNavigateHome: () => void;
  activeMeta: SavedCharacterMeta | null;
  setActiveMeta: (meta: SavedCharacterMeta | null) => void;
}) {
  const { state } = useCharacter();
  const [saveStatus, setSaveStatus] = useState<StorageStatus>('idle');
  const [isCloud, setIsCloud] = useState<boolean>(isGoogleSignedIn());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep ref to activeMeta to prevent auto-save from unmounting context tree
  const activeMetaRef = useRef<SavedCharacterMeta | null>(activeMeta);
  useEffect(() => {
    activeMetaRef.current = activeMeta;
  }, [activeMeta]);

  const triggerSave = async (currentState: CharacterState) => {
    setSaveStatus('saving');
    const cloud = isGoogleSignedIn();
    setIsCloud(cloud);

    const currentMeta = activeMetaRef.current;

    try {
      if (cloud) {
        const meta = await saveToDriveAppData(currentState, currentMeta?.driveFileId);
        // Clean up redundant local copy if re-saved to cloud
        if (currentMeta?.id && currentMeta.storageType === 'local') {
          deleteLocalCharacter(currentMeta.id);
        }
        activeMetaRef.current = meta;
        setActiveMeta(meta);
      } else {
        const meta = saveCharacterLocally(currentState, currentMeta?.id);
        activeMetaRef.current = meta;
        setActiveMeta(meta);
      }
      saveDraftLocally(currentState);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Auto-save error:', err);
      try {
        const meta = saveCharacterLocally(currentState, currentMeta?.id);
        activeMetaRef.current = meta;
        setActiveMeta(meta);
        setSaveStatus('saved');
      } catch (localErr) {
        setSaveStatus('error');
      }
    }
  };

  useEffect(() => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      triggerSave(state);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [state]);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <IdentityForm />;
      case 1:
        return <RaceSelector />;
      case 2:
        return <BackgroundSelector />;
      case 3:
        return <AbilityScoreSelector />;
      case 4:
        return <AOSelector />;
      case 5:
        return <SkillsSelector />;
      case 6:
        return <ProficienciesSelector />;
      case 7:
        return <SpellSlotsSelector />;
      case 8:
        return <SpellsSelector />;
      case 9:
        return <EquipmentSelector />;
      case 10:
        return <FinishingTouches />;
      default:
        return <div>Step {currentStep} - Coming Soon</div>;
    }
  };

  return (
    <Layout
      currentStep={currentStep}
      onNavigate={onNavigate}
      onNavigateHome={onNavigateHome}
      saveStatus={saveStatus}
      isCloud={isCloud}
      onRetrySave={() => triggerSave(state)}
    >
      {renderStep()}
    </Layout>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'builder'>('home');
  const [currentStep, setCurrentStep] = useState(0);
  const [initialCharacterState, setInitialCharacterState] = useState<Partial<CharacterState>>(DEFAULT_CHARACTER);
  const [activeMeta, setActiveMeta] = useState<SavedCharacterMeta | null>(null);
  const [sessionKey, setSessionKey] = useState<string>('session_init');

  const handleSelectCharacter = (loadedState: CharacterState, meta?: SavedCharacterMeta) => {
    setInitialCharacterState(loadedState);
    setActiveMeta(meta || null);
    setSessionKey(`session_${Date.now()}`);
    setCurrentStep(0);
    setCurrentView('builder');
  };

  const handleCreateNew = () => {
    const initialMeta = saveCharacterLocally(DEFAULT_CHARACTER);
    setInitialCharacterState(DEFAULT_CHARACTER);
    setActiveMeta(initialMeta);
    setSessionKey(`session_${Date.now()}`);
    setCurrentStep(0);
    setCurrentView('builder');
  };

  const handleNavigateHome = () => {
    setCurrentView('home');
  };

  return (
    <>
      {currentView === 'home' ? (
        <HomePage onSelectCharacter={handleSelectCharacter} onCreateNew={handleCreateNew} />
      ) : (
        <CharacterProvider key={sessionKey} initialState={initialCharacterState}>
          <BuilderContent
            currentStep={currentStep}
            onNavigate={setCurrentStep}
            onNavigateHome={handleNavigateHome}
            activeMeta={activeMeta}
            setActiveMeta={setActiveMeta}
          />
        </CharacterProvider>
      )}
    </>
  );
}
