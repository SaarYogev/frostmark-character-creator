import React, { useState } from 'react';
import { CharacterProvider } from '../contexts/CharacterContext';
import { Layout } from './Layout';
import IdentityForm from './IdentityForm';
import RaceSelector from './RaceSelector';
import BackgroundSelector from './BackgroundSelector';

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
