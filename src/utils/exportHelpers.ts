import { exportToPDF, downloadPDF } from '../logic/pdf';
import { RACES } from '../data/races';
import { BACKGROUNDS } from '../data/backgrounds';
import { CharacterState } from '../types/Character';
import { exportCharacterJSON } from '../logic/state';

export function handleExportJSON(state: CharacterState) {
  const charName = state.identity?.characterName || (state as any).characterName || 'character';
  const json = exportCharacterJSON(state, RACES);
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(json);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `${charName}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export async function handleExportPDF(state: CharacterState) {
  try {
    const pdfBytes = await exportToPDF(state, RACES, BACKGROUNDS);
    const charName = state.identity?.characterName || (state as any).characterName || 'frostmark-character';
    downloadPDF(pdfBytes, `${charName.replace(/\s+/g, '_')}.pdf`);
  } catch (err: any) {
    console.error('Export PDF error:', err);
    alert('Error generating PDF: ' + err.message);
  }
}
