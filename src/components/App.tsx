import React, { useState } from 'react';
import { CharacterProvider } from '../contexts/CharacterContext';
import { Layout } from './Layout';
import IdentityForm from './IdentityForm';
import RaceSelector from './RaceSelector';

export default function App() {
  const [currentStep, setCurrentStep] = useState(0);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <IdentityForm />;
      case 1:
        return <RaceSelector />;
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
