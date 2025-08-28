import {
  RoborockCleaningMode,
  RoborockSuctionMode,
  RoborockMopMode,
  RoborockRouteMode,
  MyHomeAssistant,
  HassEntity,
} from './types'

export class VacuumRobot {
  private hass!: MyHomeAssistant;
  private entity_id!: string;

  get name(): string {
    return this.entity_id.replace('vacuum.', '');
  }

  static isSupportedSuctionMode(mode: RoborockSuctionMode, cleaningMode: RoborockCleaningMode): boolean {
    switch (cleaningMode) {
      case RoborockCleaningMode.VacAndMop:
        return [RoborockSuctionMode.Quiet, RoborockSuctionMode.Balanced, RoborockSuctionMode.Turbo, RoborockSuctionMode.Max].includes(mode);
      case RoborockCleaningMode.Vac:
        return [RoborockSuctionMode.Quiet, RoborockSuctionMode.Balanced, RoborockSuctionMode.Turbo, RoborockSuctionMode.Max, RoborockSuctionMode.MaxPlus].includes(mode);
      case RoborockCleaningMode.Mop:
        return mode == RoborockSuctionMode.Off;
    }
  }

  static isSupportedMopMode(mode: RoborockMopMode, cleaningMode: RoborockCleaningMode): boolean {
    switch (cleaningMode) {
      case RoborockCleaningMode.VacAndMop:
      case RoborockCleaningMode.Mop:
        return [RoborockMopMode.Mild, RoborockMopMode.Moderate, RoborockMopMode.Intense].includes(mode);
      case RoborockCleaningMode.Vac:
        return mode == RoborockMopMode.Off;
    }
  }

  static isSupportedRouteMode(mode: RoborockRouteMode, cleaningMode: RoborockCleaningMode): boolean {
    switch (cleaningMode) {
      case RoborockCleaningMode.VacAndMop:
      case RoborockCleaningMode.Vac:
        return [RoborockRouteMode.Fast, RoborockRouteMode.Standard].includes(mode);
      case RoborockCleaningMode.Mop:
        return [RoborockRouteMode.Fast, RoborockRouteMode.Standard, RoborockRouteMode.Deep, RoborockRouteMode.DeepPlus].includes(mode);
    }
  }

  constructor() {
    
  }

  public setHass(hass: MyHomeAssistant) {
    this.hass = hass;
  }

  public setEntity(entity_id: string) {
    this.entity_id = entity_id;
  }

  public getSuctionMode(): RoborockSuctionMode {
    return this.getAttributeValue(this.hass.states[this.entity_id], 'fan_speed');
  }

  public getMopMode(): RoborockMopMode {
    // Try German entity names first, then English fallback
    const entityId = this._getExistingSensorId([
      `select.${this.name}_mop_intensity`,
      `select.${this.name}_mopp_intensitaet`,
      `select.${this.name}_wischintensitaet`
    ]) || `select.${this.name}_mop_intensity`;
    
    return this.state(entityId);
  }

  public getRouteMode(): RoborockRouteMode {
    // Try German entity names first, then English fallback
    const entityId = this._getExistingSensorId([
      `select.${this.name}_mop_mode`,
      `select.${this.name}_mopp_modus`,
      `select.${this.name}_wischmodus`
    ]) || `select.${this.name}_mop_mode`;
    
    return this.state(entityId);
  }

  public callServiceAsync(service: string) {
    return this.hass.callService('vacuum', service, {
      entity_id: this.entity_id,
    });
  }

  public startSegmentsCleaningAsync(roborock_area_ids: number[], repeat: number) {
    return this.hass.callService('vacuum', 'send_command', {
      entity_id: this.entity_id,
      command: 'app_segment_clean',
      params: [{
        segments: roborock_area_ids,
        repeat: repeat,
      }],
    });
  }

  public setSuctionModeAsync(value: RoborockSuctionMode) {
    return this.hass.callService('vacuum', 'set_fan_speed', {
      entity_id: this.entity_id,
      fan_speed: value,
    });
  }

  public setMopModeAsync(value: RoborockMopMode) {
    // Try German entity names first, then English fallback
    const entityId = this._getExistingSensorId([
      `select.${this.name}_mop_intensity`,
      `select.${this.name}_mopp_intensitaet`,
      `select.${this.name}_wischintensitaet`
    ]) || `select.${this.name}_mop_intensity`;
    
    return this.hass.callService('select', 'select_option', {
      entity_id: entityId,
      option: value,
    });
  }

  public setRouteModeAsync(value: RoborockRouteMode) {
    // Try German entity names first, then English fallback
    const entityId = this._getExistingSensorId([
      `select.${this.name}_mop_mode`,
      `select.${this.name}_mopp_modus`,
      `select.${this.name}_wischmodus`
    ]) || `select.${this.name}_mop_mode`;
    
    return this.hass.callService('select', 'select_option', {
      entity_id: entityId,
      option: value,
    });
  }

  private state(id: string): any {
    return this.hass.states[id].state;
  }

  private getAttributeValue(entity: HassEntity, attribute: string) {
    return entity.attributes[attribute];
  }

  private _getExistingSensorId(sensorIds: string[]): string | undefined {
    for (let sensorId of sensorIds) {
      if (this.hass.states[sensorId])
        return sensorId;
    }
  }
}