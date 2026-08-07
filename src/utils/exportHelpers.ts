import { exportToPDF, downloadPDF } from '../logic/pdf';
import { RACES } from '../data/races';
import { BACKGROUNDS } from '../data/backgrounds';
import { CharacterState } from '../types/Character';

export function handleExportJSON(state: CharacterState) {
  const charName = state.identity?.characterName || (state as any).characterName || 'character';
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
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
