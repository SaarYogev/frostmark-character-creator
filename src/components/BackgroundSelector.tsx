import React, { useContext } from 'react';
import { useCharacter } from '../contexts/CharacterContext';
import { BACKGROUNDS } from '../../js/data/backgrounds';

interface BackgroundSelectorProps {
  onNext: () => void;
}

const BackgroundSelector: React.FC<BackgroundSelectorProps> = ({ onNext }) => {
  const { character, setCharacter } = useContext(CharacterContext);

  const handleBackgroundChange = (backgroundName: string) => {
    const selectedBackground = BACKGROUNDS.find(bg => bg.name === backgroundName);
    if (selectedBackground) {
      setCharacter(prev => ({
        ...prev,
        background: selectedBackground
      }));
    }
  };

  return (
    <div className="background-selector">
      <h2>Select Your Background</h2>
      <div className="background-grid">
        {BACKGROUNDS.map((background) => (
          <div
            key={background.name}
            className={`background-card ${character.background?.name === background.name ? 'selected' : ''}`}
            onClick={() => handleBackgroundChange(background.name)}
          >
            <h3>{background.name}</h3>
            <p><strong>Skills:</strong> {background.skills.join(', ')}</p>
            <p><strong>Gold:</strong> {background.gold}</p>
            <p><strong>Equipment:</strong> {background.equipment}</p>
            <p><strong>Trait:</strong> {background.trait}</p>
            <p><strong>Description:</strong> {background.desc}</p>
          </div>
        ))}
      </div>
      <button onClick={onNext}>Next</button>
    </div>
  );
};

export default BackgroundSelector;