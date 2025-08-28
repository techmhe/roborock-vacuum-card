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
    const entityId = this.getExistingEntityId([
      `select.${this.name}_mop_intensity`,    // English
      `select.${this.name}_wischmopp_intensiat`, // German
    ]);
    return entityId ? this.state(entityId) : RoborockMopMode.Off;
  }

  public getRouteMode(): RoborockRouteMode {
    const entityId = this.getExistingEntityId([
      `select.${this.name}_mop_mode`,         // English
      `select.${this.name}_route`,            // German
    ]);
    return entityId ? this.state(entityId) : RoborockRouteMode.Standard;
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
    const entityId = this.getExistingEntityId([
      `select.${this.name}_mop_intensity`,    // English
      `select.${this.name}_wischmopp_intensiat`, // German
    ]);
    if (!entityId) return Promise.resolve();
    
    return this.hass.callService('select', 'select_option', {
      entity_id: entityId,
      option: value,
    });
  }

  public setRouteModeAsync(value: RoborockRouteMode) {
    const entityId = this.getExistingEntityId([
      `select.${this.name}_mop_mode`,         // English
      `select.${this.name}_route`,            // German
    ]);
    if (!entityId) return Promise.resolve();
    
    return this.hass.callService('select', 'select_option', {
      entity_id: entityId,
      option: value,
    });
  }

  public loadMultiMapAsync(mapFlag: number) {
    return this.hass.callService('vacuum', 'send_command', {
      entity_id: this.entity_id,
      command: 'load_multi_map',
      params: {
        map_flag: mapFlag,
      },
    });
  }

  private state(id: string): any {
    return this.hass.states[id].state;
  }

  private getAttributeValue(entity: HassEntity, attribute: string) {
    return entity.attributes[attribute];
  }

  private getExistingEntityId(entityIds: string[]): string | undefined {
    for (let entityId of entityIds) {
      if (this.hass.states[entityId])
        return entityId;
    }
    return undefined;
  }
}