import React, { useState, useEffect, useMemo } from 'react';
import { useCharacter } from '../contexts/CharacterContext';
import { WEAPONS, ARMOR as ARMORS } from '../data/equipment';

export interface EquipmentItem {
  name: string;
  cost?: string;
  damage?: string;
  weight?: string | number;
  properties?: string;
  category?: string;
  av?: number | string;
  stealth?: string;
  isWeapon?: boolean;
  isArmor?: boolean;
  quantity?: number;
  hit?: string;
  range?: string;
  isCustom?: boolean;
  isOther?: boolean;
}

function getItemGoldCost(item: EquipmentItem): number {
  if (!item.cost) return 0;
  const parsed = parseInt(item.cost.replace(/[^\d]/g, ''), 10);
  return isNaN(parsed) ? 0 : parsed;
}

const EquipmentSelector: React.FC = () => {
  const { state, dispatch } = useCharacter();

  const [showWeaponForm, setShowWeaponForm] = useState(false);
  const [customWeaponName, setCustomWeaponName] = useState('');
  const [customWeaponCost, setCustomWeaponCost] = useState('');
  const [customWeaponDamage, setCustomWeaponDamage] = useState('');
  const [customWeaponHit, setCustomWeaponHit] = useState('');
  const [customWeaponRange, setCustomWeaponRange] = useState('');
  const [customWeaponWeight, setCustomWeaponWeight] = useState('');

  const [showArmorForm, setShowArmorForm] = useState(false);
  const [customArmorName, setCustomArmorName] = useState('');
  const [customArmorCost, setCustomArmorCost] = useState('');
  const [customArmorAV, setCustomArmorAV] = useState('');
  const [customArmorWeight, setCustomArmorWeight] = useState('');

  const [showItemForm, setShowItemForm] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemCost, setCustomItemCost] = useState('');
  const [customItemWeight, setCustomItemWeight] = useState('');
  const [customItemQty, setCustomItemQty] = useState('1');

  const [customWeaponsStore, setCustomWeaponsStore] = useState<EquipmentItem[]>([]);
  const [customArmorsStore, setCustomArmorsStore] = useState<EquipmentItem[]>([]);

  const equipmentList: EquipmentItem[] = state.equipment?.equipmentList ?? (state as any).equipmentList ?? [];
  const manualEquipment: boolean = state.equipment?.manualEquipment ?? (state as any).manualEquipment ?? false;
  const goldAmount: number = (state as any).goldAmount ?? state.proficiencies?.goldAmount ?? 10;

  const goldSpent = useMemo(() => {
    let spent = 0;
    equipmentList.forEach((item) => {
      spent += getItemGoldCost(item);
    });
    return spent;
  }, [equipmentList]);

  const goldRemaining = goldAmount - goldSpent;
  const totalItemsCount = equipmentList.length;

  const updateEquipment = (nextList: EquipmentItem[]) => {
    dispatch({ type: 'SET_EQUIPMENT', payload: { equipmentList: nextList } } as any);
    dispatch({ type: 'SET_STATE', payload: { equipmentList: nextList } } as any);
  };

  const handleToggleItem = (itemData: EquipmentItem, type: 'weapon' | 'armor') => {
    const existing = equipmentList.find((i) => i.name === itemData.name);
    if (existing) {
      updateEquipment(equipmentList.filter((i) => i.name !== itemData.name));
    } else {
      updateEquipment([
        ...equipmentList,
        {
          ...itemData,
          isWeapon: type === 'weapon',
          isArmor: type === 'armor',
          quantity: 1,
        },
      ]);
    }
  };

  const [editingItemName, setEditingItemName] = useState<string | null>(null);

  const handleSaveCustomWeapon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customWeaponName.trim()) return;
    const rangeVal = customWeaponRange.trim();
    const costVal = parseInt(customWeaponCost, 10) || 0;
    const newItem: EquipmentItem = {
      name: customWeaponName.trim(),
      cost: costVal > 0 ? `${costVal} gp` : '0 gp',
      damage: customWeaponDamage.trim() || '—',
      hit: customWeaponHit.trim() || '+0',
      range: rangeVal ? `${rangeVal} ft` : '5 ft',
      weight: customWeaponWeight.trim() || '0',
      isWeapon: true,
      isCustom: true,
      quantity: 1,
    };
    if (editingItemName) {
      updateEquipment(equipmentList.map((i) => (i.name === editingItemName ? newItem : i)));
    } else {
      updateEquipment([...equipmentList, newItem]);
    }
    setCustomWeaponName('');
    setCustomWeaponCost('');
    setCustomWeaponDamage('');
    setCustomWeaponHit('');
    setCustomWeaponRange('');
    setCustomWeaponWeight('');
    setEditingItemName(null);
    setShowWeaponForm(false);
  };

  const handleSaveCustomArmor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customArmorName.trim()) return;
    const costVal = parseInt(customArmorCost, 10) || 0;
    const newItem: EquipmentItem = {
      name: customArmorName.trim(),
      cost: costVal > 0 ? `${costVal} gp` : '0 gp',
      av: customArmorAV.trim() || '0',
      weight: customArmorWeight.trim() || '0',
      isArmor: true,
      isCustom: true,
      quantity: 1,
    };
    if (editingItemName) {
      updateEquipment(equipmentList.map((i) => (i.name === editingItemName ? newItem : i)));
    } else {
      updateEquipment([...equipmentList, newItem]);
    }
    setCustomArmorName('');
    setCustomArmorCost('');
    setCustomArmorAV('');
    setCustomArmorWeight('');
    setEditingItemName(null);
    setShowArmorForm(false);
  };

  const handleSaveCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemName.trim()) return;
    const weight = parseFloat(customItemWeight) || 0;
    const quantity = parseInt(customItemQty, 10) || 1;
    const costVal = parseInt(customItemCost, 10) || 0;
    const newItem: EquipmentItem = {
      name: customItemName.trim(),
      cost: costVal > 0 ? `${costVal} gp` : '0 gp',
      weight,
      quantity,
      isOther: true,
    };
    if (editingItemName) {
      updateEquipment(equipmentList.map((i) => (i.name === editingItemName ? newItem : i)));
    } else {
      updateEquipment([...equipmentList, newItem]);
    }
    setCustomItemName('');
    setCustomItemCost('');
    setCustomItemWeight('');
    setCustomItemQty('1');
    setEditingItemName(null);
    setShowItemForm(false);
  };

  const handleEditWeapon = (item: EquipmentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItemName(item.name);
    setCustomWeaponName(item.name);
    const parsedCost = item.cost ? item.cost.replace(/[^\d]/g, '') : '';
    setCustomWeaponCost(parsedCost);
    setCustomWeaponDamage(item.damage || '');
    setCustomWeaponHit(item.hit || '');
    const parsedRange = item.range ? item.range.replace(/[^\d]/g, '') : '';
    setCustomWeaponRange(parsedRange);
    setCustomWeaponWeight(item.weight ? String(item.weight) : '');
    setShowWeaponForm(true);
  };

  const handleEditArmor = (item: EquipmentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItemName(item.name);
    setCustomArmorName(item.name);
    const parsedCost = item.cost ? item.cost.replace(/[^\d]/g, '') : '';
    setCustomArmorCost(parsedCost);
    setCustomArmorAV(item.av ? String(item.av) : '');
    setCustomArmorWeight(item.weight ? String(item.weight) : '');
    setShowArmorForm(true);
  };

  const handleEditOtherItem = (item: EquipmentItem) => {
    setEditingItemName(item.name);
    setCustomItemName(item.name);
    const parsedCost = item.cost ? item.cost.replace(/[^\d]/g, '') : '';
    setCustomItemCost(parsedCost);
    setCustomItemWeight(item.weight ? String(item.weight) : '');
    setCustomItemQty(item.quantity ? String(item.quantity) : '1');
    setShowItemForm(true);
  };

  const handleRemoveItem = (itemToRemove: EquipmentItem) => {
    updateEquipment(equipmentList.filter((i) => i !== itemToRemove));
  };

  useEffect(() => {
    equipmentList.forEach((item) => {
      if (item.isCustom) {
        if (item.isWeapon && !customWeaponsStore.some((w) => w.name === item.name)) {
          setCustomWeaponsStore((prev) => [...prev, item]);
        } else if (item.isArmor && !customArmorsStore.some((a) => a.name === item.name)) {
          setCustomArmorsStore((prev) => [...prev, item]);
        }
      }
    });
  }, [equipmentList]);

  const weaponsList = useMemo(() => {
    const preset = WEAPONS ?? [];
    const customList = customWeaponsStore.filter((c) => !preset.some((p) => p.name === c.name));
    return [...preset, ...customList];
  }, [customWeaponsStore]);

  const armorsList = useMemo(() => {
    const preset = ARMORS ?? [];
    const customList = customArmorsStore.filter((c) => !preset.some((p) => p.name === c.name));
    return [...preset, ...customArmorsStore];
  }, [customArmorsStore]);

  const otherItems = useMemo(() => {
    const presetWeapons = (WEAPONS ?? []).map((w) => w.name);
    const presetArmors = (ARMORS ?? []).map((a) => a.name);
    return equipmentList.filter((i) => !i.isWeapon && !i.isArmor && !presetWeapons.includes(i.name) && !presetArmors.includes(i.name));
  }, [equipmentList]);

  const selectedNames = useMemo(() => equipmentList.map((i) => i.name), [equipmentList]);

  return (
    <div className="equipment-selector">
      <div className="step-container">
        <div className="step-header">
          <h2 className="step-title">⚔️ Equipment</h2>
          <p className="step-desc">Choose starting weapons and armor, or add custom items.</p>
        </div>

        <div className="manual-override-control" style={{ marginBottom: '1.5rem' }}>
          <label className="checkbox-label" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={manualEquipment}
              onChange={(e) =>
                dispatch({
                  type: 'SET_STATE',
                  payload: { manualEquipment: e.target.checked },
                } as any)
              }
            />
            <strong>Manual Equipment Override (Ignore starting gold cost limits)</strong>
          </label>
        </div>

        <div className={`point-buy-tracker ${goldRemaining < 0 ? 'over-budget' : ''}`} style={{ marginBottom: '1.5rem' }}>
          <span>Gold Remaining:</span>
          <strong>{goldRemaining} gp</strong>
          <span>/ {goldAmount} gp</span>
        </div>

        <div className="section-block" style={{ marginBottom: '2rem' }}>
          <h3 className="section-title">Weapons</h3>
          <div className="equipment-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', marginBottom: '12px' }}>
            {weaponsList.map((item: any) => {
              const name = item.name;
              const isSelected = selectedNames.includes(name);
              const cost = getItemGoldCost(item);
              const canAfford = isSelected || goldRemaining >= cost;
              const isDisabled = !isSelected && !canAfford && !manualEquipment;
              const tooltip = isDisabled
                ? `Cannot afford this item (costs ${cost} gp, but you only have ${goldRemaining} gp remaining). Set to manual to bypass.`
                : `Cost: ${item.cost || '0 gp'} | Damage: ${item.damage || '—'} | Weight: ${item.weight || '0'} | Properties: ${item.properties || 'None'}`;

              return (
                <div
                  key={name}
                  id={`equip-weapon-${name.replace(/\s/g, '-')}`}
                  className={`equipment-entry ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                  title={tooltip}
                  onClick={() => !isDisabled && handleToggleItem(item, 'weapon')}
                  style={{
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.5 : 1,
                    pointerEvents: isDisabled ? 'none' : 'auto',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="equip-name">{name}</span>
                    {item.isCustom && (
                      <button
                        title="Edit custom weapon"
                        onClick={(e) => handleEditWeapon(item, e)}
                        className="btn-icon"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                          borderRadius: '4px',
                          color: 'var(--text-secondary, #a0a5c0)',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#fff';
                          e.currentTarget.style.borderColor = 'var(--accent-color, #4a90e2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-secondary, #a0a5c0)';
                          e.currentTarget.style.borderColor = 'var(--border-color, rgba(255, 255, 255, 0.1))';
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9"></path>
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                  <span className="equip-detail" style={{ fontSize: '0.75rem', color: '#a0a5c0', display: 'block' }}>
                    {item.damage} {item.weight ? `· ${item.weight} kg` : ''} {item.range ? `· ${item.range.includes('ft') ? item.range : `${item.range} ft`}` : ''}
                  </span>
                </div>
              );
            })}
          </div>

          {!showWeaponForm ? (
            <button className="btn btn-ghost btn-sm" onClick={() => { setEditingItemName(null); setShowWeaponForm(true); }}>
              + Add Custom Weapon
            </button>
          ) : (
            <form onSubmit={handleSaveCustomWeapon} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '550px' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--accent-color, #4a90e2)' }}>{editingItemName ? 'Edit Custom Weapon' : 'Add Custom Weapon'}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
                <input type="text" className="input" placeholder="Name *" value={customWeaponName} onChange={(e) => setCustomWeaponName(e.target.value)} required />
                <input type="number" className="input" placeholder="Cost (gp)" value={customWeaponCost} onChange={(e) => setCustomWeaponCost(e.target.value)} />
                <input type="text" className="input" placeholder="Damage" value={customWeaponDamage} onChange={(e) => setCustomWeaponDamage(e.target.value)} />
                <input type="number" className="input" placeholder="Weight (kg)" value={customWeaponWeight} onChange={(e) => setCustomWeaponWeight(e.target.value)} />
                <input type="number" className="input" placeholder="Range (ft)" value={customWeaponRange} onChange={(e) => setCustomWeaponRange(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowWeaponForm(false); setEditingItemName(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">{editingItemName ? 'Save Weapon' : 'Add Weapon'}</button>
              </div>
            </form>
          )}
        </div>

        <div className="section-block" style={{ marginBottom: '2rem' }}>
          <h3 className="section-title">Armor</h3>
          <div className="equipment-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', marginBottom: '12px' }}>
            {armorsList.map((item: any) => {
              const name = item.name;
              const isSelected = selectedNames.includes(name);
              const cost = getItemGoldCost(item);
              const canAfford = isSelected || goldRemaining >= cost;
              const isDisabled = !isSelected && !canAfford && !manualEquipment;
              const tooltip = isDisabled
                ? `Cannot afford this item (costs ${cost} gp, but you only have ${goldRemaining} gp remaining). Set to manual to bypass.`
                : `Cost: ${item.cost || '0 gp'} | Category: ${item.category || 'Custom'} | AV: ${item.av || '0'} | Weight: ${item.weight || '0'} kg | Stealth: ${item.stealth || 'Normal'}`;

              return (
                <div
                  key={name}
                  id={`equip-armor-${name.replace(/\s/g, '-')}`}
                  className={`equipment-entry ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                  title={tooltip}
                  onClick={() => !isDisabled && handleToggleItem(item, 'armor')}
                  style={{
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.5 : 1,
                    pointerEvents: isDisabled ? 'none' : 'auto',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="equip-name">{name}</span>
                    {item.isCustom && (
                      <button
                        title="Edit custom armor"
                        onClick={(e) => handleEditArmor(item, e)}
                        className="btn-icon"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                          borderRadius: '4px',
                          color: 'var(--text-secondary, #a0a5c0)',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#fff';
                          e.currentTarget.style.borderColor = 'var(--accent-color, #4a90e2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-secondary, #a0a5c0)';
                          e.currentTarget.style.borderColor = 'var(--border-color, rgba(255, 255, 255, 0.1))';
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9"></path>
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                  <span className="equip-detail" style={{ fontSize: '0.75rem', color: '#a0a5c0', display: 'block' }}>
                    {item.av ? `AV ${item.av}` : ''} {item.weight ? `· ${item.weight} kg` : ''}
                  </span>
                </div>
              );
            })}
          </div>

          {!showArmorForm ? (
            <button className="btn btn-ghost btn-sm" onClick={() => { setEditingItemName(null); setShowArmorForm(true); }}>
              + Add Custom Armor
            </button>
          ) : (
            <form onSubmit={handleSaveCustomArmor} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '500px' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--accent-color, #4a90e2)' }}>{editingItemName ? 'Edit Custom Armor' : 'Add Custom Armor'}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
                <input type="text" className="input" placeholder="Name *" value={customArmorName} onChange={(e) => setCustomArmorName(e.target.value)} required />
                <input type="number" className="input" placeholder="Cost (gp)" value={customArmorCost} onChange={(e) => setCustomArmorCost(e.target.value)} />
                <input type="text" className="input" placeholder="Armor Value (AV)" value={customArmorAV} onChange={(e) => setCustomArmorAV(e.target.value)} />
                <input type="number" className="input" placeholder="Weight (kg)" value={customArmorWeight} onChange={(e) => setCustomArmorWeight(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowArmorForm(false); setEditingItemName(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">{editingItemName ? 'Save Armor' : 'Add Armor'}</button>
              </div>
            </form>
          )}
        </div>

        <div className="section-block">
          <h3 className="section-title">Other Items</h3>
          <div id="other-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {otherItems.length === 0 ? (
              <span style={{ color: '#606580', fontStyle: 'italic', fontSize: '0.85rem' }}>No other items added.</span>
            ) : (
              otherItems.map((item, i) => (
                <div
                  key={i}
                  className="other-item"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                  }}
                >
                  <span>
                    {item.name} {(item.quantity ?? 1) > 1 ? `×${item.quantity}` : ''} {item.weight ? `(${item.weight} kg)` : ''} {item.cost ? `[${item.cost}]` : ''}
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      title="Edit item"
                      onClick={() => handleEditOtherItem(item)}
                      className="btn-icon"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                        borderRadius: '4px',
                        color: 'var(--text-secondary, #a0a5c0)',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#fff';
                        e.currentTarget.style.borderColor = 'var(--accent-color, #4a90e2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-secondary, #a0a5c0)';
                        e.currentTarget.style.borderColor = 'var(--border-color, rgba(255, 255, 255, 0.1))';
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                    </button>
                    <button
                      className="btn-icon remove-item"
                      onClick={() => handleRemoveItem(item)}
                      style={{ background: 'none', border: 'none', color: '#eb5e55', cursor: 'pointer', fontSize: '0.95rem' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {!showItemForm ? (
            <button className="btn btn-ghost btn-sm" onClick={() => { setEditingItemName(null); setShowItemForm(true); }}>
              + Add Item
            </button>
          ) : (
            <form onSubmit={handleSaveCustomItem} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '500px' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--accent-color, #4a90e2)' }}>{editingItemName ? 'Edit Custom Item' : 'Add Custom Item'}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
                <input type="text" className="input" placeholder="Item Name *" value={customItemName} onChange={(e) => setCustomItemName(e.target.value)} required />
                <input type="number" className="input" placeholder="Cost (gp)" value={customItemCost} onChange={(e) => setCustomItemCost(e.target.value)} />
                <input type="number" className="input" placeholder="Weight (kg)" value={customItemWeight} onChange={(e) => setCustomItemWeight(e.target.value)} />
                <input type="number" className="input" min="1" placeholder="Qty" value={customItemQty} onChange={(e) => setCustomItemQty(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowItemForm(false); setEditingItemName(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">{editingItemName ? 'Save Item' : 'Add Item'}</button>
              </div>
            </form>
          )}

          {totalItemsCount > 21 && (
            <div className="warning-badge" style={{ color: '#cf721c', marginTop: '1rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
              ⚠️ Note: The physical PDF sheet can only display the first 21 items.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EquipmentSelector;
