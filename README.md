# Roborock Vacuum Card

Home Assistant vacuum card that uses core Roborock integration and supports multi-selecting areas for cleaning.

![Roborock Vacuum Card](/images/roborock-vacuum-card.png)

![Roborock Vacuum Card custom cleaning](/images/roborock-vacuum-card-popup.png)

## Caveat

This card is not highly configurable and was created for personal use. It expects (and was tested with) the Roborock S8 Pro Ultra vacuum robot and dock.

## Language Support

The card supports multiple languages and automatically detects your browser's language preference:
- **English** (en) - Default
- **German** (de) - Deutsch
- **Polish** (pl) - Polski

If your browser language is set to German (de), the card will automatically display German text for all interface elements, status messages, and error descriptions.

## German Home Assistant Integration

Starting with version 1.3.4, the card automatically supports German Home Assistant integrations. The card will automatically detect and use German entity names when available, such as:

- `binary_sensor.{robot}_reinigen` (instead of `_cleaning`)
- `sensor.{robot}_batterie` (instead of `_battery`)
- `sensor.{robot}_staubsauger_fehler` (instead of `_vacuum_error`)
- `select.{robot}_wischmopp_intensiat` (instead of `_mop_intensity`)
- `select.{robot}_route` (instead of `_mop_mode`)

For German integrations, use German entity names in your stats configuration. Example German configuration:

```yaml
type: custom:roborock-vacuum-card
entity: vacuum.robby
stats:
  default:
    - entity: sensor.robby_verbleibende_filterzeit
      divide_by: 3600
      scale: 1
      title: Filter
      unit: h
    - entity: sensor.robby_verbleibende_zeit_der_seitenburste
      divide_by: 3600
      scale: 1
      title: Seitenbürste
      unit: h
    - entity: sensor.robby_verbleibende_zeit_der_hauptburste
      divide_by: 3600
      scale: 1
      unit: h
      title: Hauptbürste
    - entity: sensor.robby_verbleibende_sensorzeit
      divide_by: 3600
      scale: 1
      unit: h
      title: Sensoren
  cleaning:
    - entity: sensor.robby_reinigungsfortschritt
      title: Reinigungsfortschritt
      unit: '%'
    - entity: sensor.robby_reinigungsbereich
      title: Reinigungsbereich
      unit: m²
    - entity: sensor.robby_reinigungszeit
      divide_by: 60
      scale: 1
      title: Reinigungszeit
      unit: min
```

## Card configuration

```yaml
type: custom:roborock-vacuum-card
entity: vacuum.robot
stats:
  default:
    - entity: sensor.robot_filter_time_left
      divide_by: 3600
      scale: 1
      title: Filter
      unit: h
    - entity: sensor.robot_side_brush_time_left
      divide_by: 3600
      scale: 1
      title: Side brush
      unit: h
    - entity: sensor.robot_main_brush_time_left
      divide_by: 3600
      scale: 1
      unit: h
      title: Main brush
    - entity: sensor.robot_sensor_time_left
      divide_by: 3600
      scale: 1
      unit: h
      title: Sensors
  cleaning:
    - entity: sensor.robot_cleaning_progress
      title: Cleaning progress
      unit: '%'
    - entity: sensor.robot_cleaning_area
      title: Cleaning area
      unit: m²
    - entity: sensor.robot_cleaning_time
      divide_by: 60
      scale: 1
      title: Cleaning time
      unit: min
areas:
  - area_id: living_room
    roborock_area_id: 12
  - area_id: master_bedroom
    roborock_area_id: 13
  - area_id: kids_bedroom
    roborock_area_id: 14
  - area_id: kitchen
    roborock_area_id: 15
  - area_id: bathroom
    roborock_area_id: 16
  - area_id: toilet
    roborock_area_id: 17
  - area_id: corridor
    roborock_area_id: 18
  - area_id: hallway
    roborock_area_id: 19
```

## Multi-Map Support

Starting with version 1.3.4, the card supports multiple maps with different room configurations. If your vacuum has multiple maps, you can use the `maps` configuration instead of `areas`:

```yaml
type: custom:roborock-vacuum-card
entity: vacuum.robby
# Use maps instead of areas for multi-map support
maps:
  # Map EG (ground floor)
  - map_flag: 0
    room_id: "16"  # Kitchen
  - map_flag: 0
    room_id: "17"  # Living Room
  - map_flag: 0
    room_id: "18"  # Hallway
  - map_flag: 0
    room_id: "19"  # Dining Room
  
  # Map OG (upper floor)
  - map_flag: 1
    room_id: "16"  # Office 1
  - map_flag: 1
    room_id: "17"  # Office 2
  - map_flag: 1
    room_id: "18"  # Hallway
  - map_flag: 1
    room_id: "19"  # WC
  - map_flag: 1
    room_id: "20"  # Bathroom

# Maps with no rooms (like Bedroom map) will appear as a single cleanable area
```

### Map Data Structure

Your vacuum entity should provide maps data in the following format:

```yaml
vacuum.robby:
  attributes:
    maps:
      - flag: 0
        name: EG
        rooms:
          "16": Küche
          "17": Wohnzimmer
          "18": Flur
          "19": Esszimmer
      - flag: 1
        name: OG
        rooms:
          "16": Arbeitszimmer 1
          "17": Arbeitszimmer 2
          "18": Flur
          "19": WC
          "20": Badezimmer
      - flag: 2
        name: Schlafzimmer
        rooms: {}
```

### Multi-Map Features

- **Map Switcher**: A button appears in the bottom right corner when multiple maps are available
- **Dynamic Rooms**: Room selection in the cleaning popup updates based on the currently selected map
- **Empty Maps**: Maps with no rooms appear as a single cleanable area using the map name
- **Backward Compatibility**: Existing `areas` configuration continues to work

```
