import { LitElement, CSSResultGroup, html, nothing, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Template, RoborockMap } from './types';
import localize from './localize';

@customElement('map-selection-popup')
export class MapSelectionPopup extends LitElement {
  @property()
  public maps: RoborockMap[] = [];
  @property()
  public currentMapFlag: number = 0;

  static get styles(): CSSResultGroup {
    return css`
      .popup-background {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: rgba(0, 0, 0, 0.32);
        z-index: 999;
      }

      .popup-card {
        position: relative;
        color: var(--primary-text-color);
        border-radius: 16px;
        background-color: var(--card-background-color);
        min-width: 300px;
        max-width: 400px;
        box-shadow: var(--ha-card-box-shadow, 0px 2px 4px rgba(0, 0, 0, 0.15));
      }

      .header {
        display: flex;
        align-items: center;
        padding: 12px;
        border-bottom: 1px solid var(--divider-color);
      }

      .text {
        flex: 1;
        text-align: center;
        font-weight: 500;
        font-size: 1.1em;
        color: var(--primary-text-color);
      }

      .content {
        padding: 16px;
      }

      .map-options {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .map-option {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: var(--card-background-color);
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        color: var(--primary-text-color);
        font-size: 1em;
      }

      .map-option:hover {
        background: var(--primary-color);
        color: var(--text-primary-color);
        border-color: var(--primary-color);
      }

      .map-option.active {
        background: var(--primary-color);
        color: var(--text-primary-color);
        border-color: var(--primary-color);
        font-weight: 500;
      }

      .map-option ha-icon {
        margin-right: 12px;
        width: 20px;
        height: 20px;
      }

      .map-option span {
        flex: 1;
      }

      .check-icon {
        margin-left: 8px;
        margin-right: 0;
        width: 16px;
        height: 16px;
      }
    `;
  }

  private onMapSelect(mapFlag: number) {
    this.dispatchEvent(new CustomEvent('map-select', {
      detail: mapFlag,
      bubbles: true,
      composed: true
    }));
    this.onClose();
  }

  private onClose() {
    this.dispatchEvent(new CustomEvent('close', {
      bubbles: true,
      composed: true
    }));
  }

  private onPopupBackgroundClick(e: MouseEvent) {
    const target = e.target as Element;
    if (!target || !target.classList.contains('popup-background'))
      return;
    this.onClose();
  }

  render(): Template {
    if (this.maps.length <= 1) {
      return nothing;
    }

    const mapButtons = this.maps.map(map => {
      const isActive = map.flag === this.currentMapFlag;
      return html`
        <button 
          class="map-option ${isActive ? 'active' : ''}"
          @click=${() => this.onMapSelect(map.flag)}
        >
          <ha-icon icon="mdi:map"></ha-icon>
          <span>${map.name}</span>
          ${isActive ? html`<ha-icon icon="mdi:check" class="check-icon"></ha-icon>` : ''}
        </button>
      `;
    });

    return html`
      <div class="popup-background" @click=${this.onPopupBackgroundClick}>
        <div class="popup-card">
          <div class="header">
            <ha-icon-button icon="mdi:close" @click=${this.onClose}>
              <ha-icon icon="mdi:close"></ha-icon>
            </ha-icon-button>
            <div class="text">${localize('common.select_map') || 'Select Map'}</div>
          </div>
          <div class="content">
            <div class="map-options">
              ${mapButtons}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}