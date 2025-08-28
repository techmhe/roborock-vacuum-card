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
    const entity = this.hass.states[this.entity_id];
    if (!entity) return RoborockSuctionMode.Balanced;
    
    // Try multiple attribute names for different integrations
    const attributeNames = ['fan_speed', 'luefter_geschwindigkeit', 'saugkraft'];
    for (const attr of attributeNames) {
      const value = this.getAttributeValue(entity, attr);
      if (value !== undefined) {
        return value;
      }
    }
    return RoborockSuctionMode.Balanced;
  }

  public getMopMode(): RoborockMopMode {
    // Try multiple patterns for mop intensity selection entity
    const patterns = [
      `select.${this.name}_mop_intensity`,
      `select.${this.name}_wischintensitaet`, // German pattern
      `select.${this.name}_mopp_intensitaet`, // German pattern
      `select.${this.name}_scrub_intensity`,
    ];
    
    for (const pattern of patterns) {
      if (this.hass.states[pattern]) {
        return this.state(pattern);
      }
    }
    
    return RoborockMopMode.Moderate; // Default fallback
  }

  public getRouteMode(): RoborockRouteMode {
    // Try multiple patterns for mop mode selection entity
    const patterns = [
      `select.${this.name}_mop_mode`,
      `select.${this.name}_wischmodus`, // German pattern
      `select.${this.name}_mopp_modus`, // German pattern
      `select.${this.name}_route_mode`,
    ];
    
    for (const pattern of patterns) {
      if (this.hass.states[pattern]) {
        return this.state(pattern);
      }
    }
    
    return RoborockRouteMode.Standard; // Default fallback
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
    // Find the actual mop intensity entity
    const patterns = [
      `select.${this.name}_mop_intensity`,
      `select.${this.name}_wischintensitaet`, // German pattern
      `select.${this.name}_mopp_intensitaet`, // German pattern
      `select.${this.name}_scrub_intensity`,
    ];
    
    for (const pattern of patterns) {
      if (this.hass.states[pattern]) {
        return this.hass.callService('select', 'select_option', {
          entity_id: pattern,
          option: value,
        });
      }
    }
    
    // Fallback to default pattern if nothing found
    return this.hass.callService('select', 'select_option', {
      entity_id: `select.${this.name}_mop_intensity`,
      option: value,
    });
  }

  public setRouteModeAsync(value: RoborockRouteMode) {
    // Find the actual route mode entity
    const patterns = [
      `select.${this.name}_mop_mode`,
      `select.${this.name}_wischmodus`, // German pattern
      `select.${this.name}_mopp_modus`, // German pattern
      `select.${this.name}_route_mode`,
    ];
    
    for (const pattern of patterns) {
      if (this.hass.states[pattern]) {
        return this.hass.callService('select', 'select_option', {
          entity_id: pattern,
          option: value,
        });
      }
    }
    
    // Fallback to default pattern if nothing found
    return this.hass.callService('select', 'select_option', {
      entity_id: `select.${this.name}_mop_mode`,
      option: value,
    });
  }

  private state(id: string): any {
    const entity = this.hass.states[id];
    return entity ? entity.state : undefined;
  }

  private getAttributeValue(entity: HassEntity, attribute: string) {
    return entity.attributes[attribute];
  }
}