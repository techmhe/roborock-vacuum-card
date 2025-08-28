import { LitElement, CSSResultGroup, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  fireEvent,
} from 'custom-card-helpers';
import styles from './styles.css';
import buildConfig from './config'
import localize from './localize';
import { VacuumRobot } from './vacuum_robot'
import {
  Template,
  RoborockArea,
  RoborockSensorIds,
  RoborockVacuumCardConfig,
  MyHomeAssistant,
  HassEntity,
  RoborockSuctionMode,
  RoborockMopMode,
  RoborockMap,
} from './types'
import { formatTime } from './format'
import { getSuctionIcon, getMoppingIcon as getMopIcon, getRouteIcon } from './resorces'
import { CustomCleaningPopup } from './custom-cleaning-popup'
import { MapSelectionPopup } from './map-selection-popup'

typeof (CustomCleaningPopup);
typeof (MapSelectionPopup);

const PKG_VERSION = 'PKG_VERSION_VALUE';

console.info(
  `%c ROBOROCK-VACUUM-CARD %c ${PKG_VERSION}`,
  'color: white; background: black; font-weight: 700;',
  'color: black; background: white; font-weight: 700;',
);

@customElement('roborock-vacuum-card')
export class RoborockVacuumCard extends LitElement {
  @property({ attribute: false })
  public hass!: MyHomeAssistant;
  @state()
  private config!: RoborockVacuumCardConfig;
  @state()
  private popupActive: boolean = false;
  @state()
  private mapSelectionPopupActive: boolean = false;

  private iconColor: string = '#000';
  private robot!: VacuumRobot;

  get name(): string {
    return this.config.entity.replace('vacuum.', '');
  }

  get sensor(): RoborockSensorIds {
    const name = this.name;
    return {
      cleaning: this._getExistingSensorId([
        `binary_sensor.${name}_cleaning`,      // English
        `binary_sensor.${name}_reinigen`,      // German
      ]),
      mopDrying: this._getExistingSensorId([
        `binary_sensor.${name}_mop_drying`,    // English
        `binary_sensor.${name}_mopp_trocknen`, // German (hypothetical)
      ]),
      mopDryingRemainingTime: this._getExistingSensorId([
        `sensor.${name}_mop_drying_remaining_time`,    // English
        `sensor.${name}_mopp_trocknen_verbleibende_zeit`, // German (hypothetical)
      ]),
      battery: this._getExistingSensorId([
        `sensor.${name}_battery`,              // English
        `sensor.${name}_batterie`,             // German
      ]),
    };
  }

  static get styles(): CSSResultGroup {
    return styles;
  }

  constructor() {
    super();
    this.robot = new VacuumRobot();
  }

  setConfig(config: RoborockVacuumCardConfig) {
    this.config = buildConfig(config);
    this.robot.setEntity(this.config.entity);
  }

  getCardSize(): Number {
    return 3;
  }

  connectedCallback() {
    super.connectedCallback();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  private onPopupShow(event: MouseEvent) {
    event.stopPropagation();
    this.popupActive = true;
  }

  private onPopupClose(event: MouseEvent) {
    event.stopPropagation();
    this.popupActive = false;
  }

  private onMapSelectionPopupClose(event: MouseEvent) {
    event.stopPropagation();
    this.mapSelectionPopupActive = false;
  }

  protected render(): Template {
    if (!this.hass || !this.config)
      return nothing;

    this.iconColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--state-icon-color")
      .trim();
    this.robot.setHass(this.hass);

    const isCleaning = this.sensor.cleaning ? this.state(this.sensor.cleaning) == 'on' : false;
    const state = this.state(this.config.entity);
    const combinedState = this.renderState(state);
    const errors = this.renderErrors();
    const name = this.renderName();
    const mode = this.renderMode();
    const mopDrying = this.renderMopDrying();
    const battery = this.renderBattery();
    const stats = this.renderStats(isCleaning ? 'cleaning' : state);
    const actions = this.renderActions(isCleaning, state);
    const mapSwitcher = this.renderMapSwitcher();

    const popup = this.renderPopup();
    const mapSelectionPopup = this.renderMapSelectionPopup();

    return html`
      <ha-card>
        <div class="header">
          ${name}
          ${mode}
          ${mopDrying}
          ${battery}
        </div>
        <div class="content" @click=${this.onPopupShow}>
          ${errors}
          <div class="state">
            ${combinedState}
          </div>
        </div>
        ${stats}
        <div class="actions">
          ${actions}
          ${mapSwitcher}
        </div>
      </ha-card>
      ${popup}
      ${mapSelectionPopup}
    `;
  }

  private renderState(state: string | undefined) {
    const reachStatusSensor = this._getExistingSensorId([`sensor.${this.name}_status`]);
    if (!reachStatusSensor)
      return localize(`status.${state}`);

    const reachState = this.state(reachStatusSensor);
    return state == reachState
      ? localize(`status.${state}`)
      : localize(`status.${state}`) + '. ' + localize(`reach_status.${reachState}`) + '.';
  }

  private renderPopup(): Template {
    if (!this.hass || !this.config || (!this.config.areas && !this.config.maps) || !this.popupActive)
      return nothing;

    const areas = this.getAreas();

    return html`
      <custom-cleaning-popup robot=${this.robot} areas=${areas} iconColor=${this.iconColor} @close=${this.onPopupClose}></custom-cleaning-popup>
    `;
  }

  private renderMapSelectionPopup(): Template {
    if (!this.hass || !this.config || !this.mapSelectionPopupActive)
      return nothing;

    const maps = this.getVacuumMaps();
    if (maps.length <= 1) {
      return nothing;
    }

    const currentMapFlag = this.getCurrentMapFlag();

    return html`
      <map-selection-popup 
        .maps=${maps} 
        .currentMapFlag=${currentMapFlag}
        @close=${this.onMapSelectionPopupClose}
        @map-select=${this.onMapSelect}
      ></map-selection-popup>
    `;
  }

  private renderErrors(): Template {
    if (!this.hass || !this.config)
      return nothing;

    const vacuumErrorSensor = this._getExistingSensorId([
        `sensor.${this.name}_vacuum_error`,      // English
        `sensor.${this.name}_current_error`,     // English alternative
        `sensor.${this.name}_staubsauger_fehler`, // German
      ]),
      docErrorSensor = this._getExistingSensorId([
        `sensor.${this.name}_dock_error`,        // English
        `sensor.${this.name}_station_fehler`,    // German (hypothetical)
      ]);

    let isVacuumError = false;
    let vacuum: Template = nothing;
    if (vacuumErrorSensor) {
      const rawVacuumError = this.state(vacuumErrorSensor),
        vacuumError = `vacuum_error.${rawVacuumError}`;

      isVacuumError = rawVacuumError != "none";
      if (isVacuumError)
        vacuum = html`<div>${localize('common.vacuum_error')}: ${localize(vacuumError)}.</div>`;
    }

    let isDocError = false;
    let doc: Template = nothing;
    if (docErrorSensor) {
      const rawDocError = this.state(docErrorSensor),
        docError = `doc_error.${rawDocError}`;

      isDocError = rawDocError != 'ok';
      if (isDocError)
        doc = html`<div>${localize('common.doc_error')}: ${localize(docError)}.</div>`;
    }

    if (!isVacuumError && !isDocError)
      return nothing;

    return html`
      <div class="errors">
        ${vacuum}
        ${doc}
      </div>
    `;
  }

  private renderStats(state: string | undefined): Template {
    if (state === undefined)
      return nothing;

    const statsList = this.config.stats[state] || this.config.stats.default || [];

    const stats = statsList.map(
      ({ entity, attribute, scale, divide_by, unit, title }) => {
        if (!entity && !attribute)
          return nothing;

        let state;

        if (entity && attribute) {
          state = this.getAttributeValue(this.hass.states[entity], attribute);
        } else if (attribute) {
          state = this.getAttributeValue(this.hass.states[this.config.entity], attribute);
        } else if (entity) {
          state = this.state(entity);
        } else {
          return nothing;
        }

        if (state === undefined) {
          state = 'N/A';
        } else {
          const needProcessing = scale != null || divide_by != null;
          if (needProcessing) {
            let value = parseFloat(state);

            if (divide_by != null && divide_by > 0)
              value = value / divide_by;

            if (scale != null)
              state = value.toFixed(scale);
            else
              state = value.toString();
          }
        }

        return html`
          <div class="stats-block" @click="${() => this.handleMore(entity)}">
            <span class="stats-value">${state}</span>
            ${unit}
            <div class="stats-subtitle">${title}</div>
          </div>
        `;
      },
    );

    if (!stats.length) {
      return nothing;
    }

    return html`<div class="stats">${stats}</div>`;
  }

  private renderActions(isCleaning: boolean, state: string | undefined) {
    if (isCleaning) {
      const pauseResume = state == 'paused'
        ? html`
        <paper-button @click="${this.handleVacuumAction('start')}">
          <ha-icon icon="hass:play"></ha-icon>
          ${localize('common.resume')}
        </paper-button>`
        : html`
        <paper-button @click="${this.handleVacuumAction('pause')}">
          <ha-icon icon="hass:pause"></ha-icon>
          ${localize('common.pause')}
        </paper-button>`;

      return html`
      ${pauseResume}
      <paper-button @click="${this.handleVacuumAction('stop')}">
        <ha-icon icon="hass:stop"></ha-icon>
        ${localize('common.stop')}
      </paper-button>
      <paper-button @click="${this.handleVacuumAction('return_to_base')}">
        <ha-icon icon="hass:home-map-marker"></ha-icon>
        ${localize('common.return_to_base')}
      </paper-button>
      `;
    } else {
      return html`
      <paper-button @click="${this.handleVacuumAction('start')}">
        <ha-icon icon="hass:play"></ha-icon>
        ${localize('common.start')}
      </paper-button>
      <paper-button @click="${this.handleVacuumAction('locate')}">
      <ha-icon icon="mdi:map-marker"></ha-icon>
      ${localize('common.locate')}
      </paper-button>
      `;
    }
  }

  private renderName(): Template {
    const entity = this.hass.states[this.config.entity];
    const data = {
      friendly_name: this.getAttributeValue(entity, 'friendly_name'),
      icon: this.getAttributeValue(entity, 'icon'),
    };

    return html`
      <div class="tip" @click="${() => this.handleMore(this.config.entity)}">
        <ha-icon icon="${data.icon}"></ha-icon>
        <span class="icon-title">${data.friendly_name}</span>
      </div>
    `;
  }

  private renderMode(): Template {
    const icons = [],
      suction = this.robot.getSuctionMode(),
      mop = this.robot.getMopMode(),
      route = this.robot.getRouteMode();

    if (suction != RoborockSuctionMode.Off)
      icons.push(getSuctionIcon(suction, 24, this.iconColor));
    if (mop != RoborockMopMode.Off)
      icons.push(getMopIcon(mop, 24, this.iconColor));
    icons.push(getRouteIcon(route, 24, this.iconColor));

    const result = icons.map(icon => html`<div class="tip">${icon}</div>`)

    return html`
    <div class="modes" @click=${this.onPopupShow}>
      ${result}
    </div>
    `;
  }

  private renderMopDrying(): Template {
    if (!this.sensor.mopDrying)
      return nothing;
      
    const mopDryingEntity = this.hass.states[this.sensor.mopDrying];
    if (!mopDryingEntity)
      return nothing;

    const isDrying = mopDryingEntity.state;
    if (isDrying != 'on')
      return nothing;

    if (!this.sensor.mopDryingRemainingTime)
      return html`
        <div class="tip">
          <ha-icon icon="mdi:heat-wave"></ha-icon>
          <span class="icon-title">Drying</span>
        </div>
      `;

    const timeEntity = this.hass.states[this.sensor.mopDryingRemainingTime];
    if (!timeEntity)
      return html`
        <div class="tip">
          <ha-icon icon="mdi:heat-wave"></ha-icon>
          <span class="icon-title">Drying</span>
        </div>
      `;

    const timeLeft = Number(timeEntity.state);

    return html`
      <div class="tip" @click="${() => this.handleMore(this.sensor.mopDryingRemainingTime)}">
        <ha-icon icon="mdi:heat-wave"></ha-icon>
        <span class="icon-title">${formatTime(timeLeft)}</span>
      </div>
    `;
  }

  private renderBattery(): Template {
    if (!this.sensor.battery)
      return html``;

    const entity = this.hass.states[this.sensor.battery];

    if (!entity)
      return html``;

    const n = Number(entity.state);
    const value = Number.isFinite(n) ? Math.round(n) : entity.state;
    const unit = entity.attributes.unit_of_measurement || (Number.isFinite(n) ? '%' : '');

    return html`
    <div class="tip" @click="${() => this.handleMore(this.sensor.battery)}">
      <state-badge class="battery-badge" .hass=${this.hass} .stateObj=${entity}></state-badge>
      <span class="icon-title">${value}${unit}</span>
    </div>
    `;
  }

  private handleVacuumAction(action: string) {
    return () => this.robot.callServiceAsync(action);
  }

  private handleMore(entityId?: string): void {
    fireEvent(
      this,
      'hass-more-info',
      {
        entityId,
      },
      {
        bubbles: false,
        composed: true,
      },
    );
  }

  private initializeCurrentMap() {
    // This method is no longer needed as we use the select entity
    // Keeping for backward compatibility in case it's called elsewhere
  }

  private getCurrentMapFlag(): number {
    // If map_select_entity is configured, use it to get current map
    if (this.config.map_select_entity) {
      const selectEntity = this.hass.states[this.config.map_select_entity];
      if (selectEntity && selectEntity.state) {
        const currentMapName = selectEntity.state;
        const maps = this.getVacuumMaps();
        const map = maps.find(m => m.name === currentMapName);
        if (map) {
          console.debug('Current map found:', currentMapName, 'flag:', map.flag);
          return map.flag;
        } else {
          console.debug('No map found for name:', currentMapName, 'available maps:', maps.map(m => m.name));
        }
      } else {
        console.debug('No select entity state found for:', this.config.map_select_entity);
      }
    }

    // Fallback: return first available map flag or 0
    const maps = this.getVacuumMaps();
    const fallbackFlag = maps.length > 0 ? maps[0].flag : 0;
    console.debug('Using fallback map flag:', fallbackFlag);
    return fallbackFlag;
  }

  private renderMapSwitcher(): Template {
    const maps = this.getVacuumMaps();
    
    // Only show map switcher if we have multiple maps and maps configuration
    if (!this.config.maps || this.config.maps.length === 0 || maps.length <= 1) {
      return nothing;
    }

    const currentMapFlag = this.getCurrentMapFlag();
    const currentMap = maps.find(map => map.flag === currentMapFlag);
    const mapName = currentMap ? currentMap.name : `Map ${currentMapFlag}`;

    return html`
      <div class="map-switcher" @click=${this.onMapSwitcherClick}>
        <ha-icon icon="mdi:map"></ha-icon>
        <span>${mapName}</span>
      </div>
    `;
  }

  private onMapSwitcherClick(e: Event) {
    e.stopPropagation();
    const maps = this.getVacuumMaps();
    if (maps.length <= 1) return;

    // Show map selection popup instead of cycling through maps
    this.mapSelectionPopupActive = true;
  }

  private async onMapSelect(e: CustomEvent) {
    const selectedMapFlag = e.detail as number;
    const maps = this.getVacuumMaps();
    const selectedMap = maps.find(map => map.flag === selectedMapFlag);
    
    if (!selectedMap) return;

    try {
      // First, send the load_multi_map command to the robot
      await this.robot.loadMultiMapAsync(selectedMapFlag);
      
      // Then update the Home Assistant select entity if configured
      if (this.config.map_select_entity) {
        await this.hass.callService('select', 'select_option', {
          entity_id: this.config.map_select_entity,
          option: selectedMap.name
        });
      }
    } catch (error) {
      console.error('Failed to switch map:', error);
      // You might want to show an error message to the user
    }
  }

  private getVacuumMaps(): RoborockMap[] {
    if (!this.config.maps || this.config.maps.length === 0) {
      return [];
    }

    // Build maps from user configuration
    const mapsData: { [key: number]: RoborockMap } = {};
    
    for (const mapArea of this.config.maps) {
      const { map_flag, map_name, room_id, room_name } = mapArea;
      
      if (!mapsData[map_flag]) {
        mapsData[map_flag] = {
          flag: map_flag,
          name: map_name,
          rooms: {}
        };
      }
      
      // Add room to the map
      mapsData[map_flag].rooms[room_id] = room_name;
    }
    
    const maps = Object.values(mapsData);
    console.debug('Built maps from config:', maps);
    return maps;
  }

  private getCurrentMap(): RoborockMap | undefined {
    const maps = this.getVacuumMaps();
    const currentMapFlag = this.getCurrentMapFlag();
    return maps.find(map => map.flag === currentMapFlag);
  }

  private getAreas() {
    const areas: RoborockArea[] = [];

    // Check if we have maps configuration (new multi-map mode)
    if (this.config.maps && this.config.maps.length > 0) {
      const currentMap = this.getCurrentMap();
      if (!currentMap) {
        return areas;
      }

      // If map has no rooms, create a single area with the map name
      if (!currentMap.rooms || Object.keys(currentMap.rooms).length === 0) {
        areas.push({
          icon: undefined,
          name: currentMap.name,
          area_id: `map_${currentMap.flag}`,
          roborock_area_id: currentMap.flag,
          room_id: undefined,
          map_flag: currentMap.flag,
        });
        return areas;
      }

      // Process map-based rooms from current map
      const currentMapFlag = this.getCurrentMapFlag();
      for (const { map_flag, room_id, room_name } of this.config.maps) {
        if (map_flag !== currentMapFlag) {
          continue;
        }

        areas.push({
          icon: undefined,
          name: room_name,
          area_id: `map_${map_flag}_room_${room_id}`,
          roborock_area_id: parseInt(room_id),
          room_id,
          map_flag,
        });
      }

      return areas;
    }

    // Fallback to legacy areas configuration
    if (!this.config.areas) {
      return areas;
    }

    for (let { area_id, roborock_area_id } of this.config.areas) {
      area_id = area_id.replace(/ /g, '_').toLowerCase();
      const area = this.hass.areas[area_id];
      if (!area)
        continue;

      areas.push({
        icon: area.icon,
        name: area.name,
        area_id,
        roborock_area_id,
      });
    }

    return areas;
  }

  _getExistingSensorId(sensorIds: string[]): string | undefined {
    for (let sensorId of sensorIds) {
      if (this.hass.states[sensorId])
        return sensorId;
    }
  }

  private getAttributeValue(entity: HassEntity, attribute: string): string | undefined {
    return entity.attributes[attribute];
  }

  private state(id: string): string | undefined {
    return this.hass.states[id]?.state;
  }
}
