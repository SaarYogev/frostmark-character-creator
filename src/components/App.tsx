import React, { useState } from 'react';
import { CharacterProvider } from '../contexts/CharacterContext';
import { Layout } from './Layout';
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

export default function App() {
  const [currentStep, setCurrentStep] = useState(0);

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
    <CharacterProvider>
      <Layout currentStep={currentStep} onNavigate={setCurrentStep}>
        {renderStep()}
      </Layout>
    </CharacterProvider>
  );
}
