# Testing the Multi-Map Fixes

## Changes Made

### 1. Fixed Map Selection Popup
- **Before**: Clicking the map switcher would cycle through maps
- **After**: Clicking the map switcher opens a popup with all available maps for selection

### 2. Fixed Current Map Display  
- **Before**: Map name was hardcoded to "EG"
- **After**: Map name now reflects the actual state from the `map_select_entity`

### 3. Added Robot Command Integration
- **Before**: Only updated the Home Assistant select entity
- **After**: Sends `load_multi_map` command to the robot with proper `map_flag` parameter

## How to Test

### Prerequisites
Make sure your configuration includes:
```yaml
type: custom:roborock-vacuum-card
entity: vacuum.robby
map_select_entity: select.robby_ausgewahlte_karte
maps:
  # Map EG (flag: 0)
  - map_flag: 0
    map_name: "EG"
    room_id: "16"
    room_name: "Küche"
  - map_flag: 0
    map_name: "EG" 
    room_id: "17"
    room_name: "Wohnzimmer"
  
  # Map OG (flag: 1)
  - map_flag: 1
    map_name: "OG"
    room_id: "16"
    room_name: "Arbeitszimmer 1"
  - map_flag: 1
    map_name: "OG"
    room_id: "17"
    room_name: "Arbeitszimmer 2"
    
  # Map Schlafzimmer (flag: 2)  
  - map_flag: 2
    map_name: "Schlafzimmer"
    room_id: "21"
    room_name: "Bedroom"
```

### Test Steps

1. **Verify Current Map Display**
   - Look at the bottom right corner of the card
   - The map name should match the current state of `select.robby_ausgewahlte_karte`
   - Change the select entity in HA and verify the card updates

2. **Test Map Selection Popup**
   - Click on the map switcher button (bottom right corner)
   - A popup should appear with all available maps
   - Current map should be highlighted with a checkmark
   - Click outside the popup or the X button to close it

3. **Test Map Switching**
   - Click on the map switcher to open the popup
   - Select a different map from the list
   - The popup should close
   - The robot should receive a `load_multi_map` command with the correct `map_flag`:
     - EG → `map_flag: 0`
     - OG → `map_flag: 1` 
     - Schlafzimmer → `map_flag: 2`
   - The select entity should update automatically (if your integration supports this)

4. **Test Room Selection**
   - Open the custom cleaning popup
   - The rooms shown should match the currently selected map
   - Switch maps and verify that room options update accordingly

## Troubleshooting

### Map Switcher Not Visible
- Check that you have multiple maps configured
- Verify `maps` configuration is present
- Ensure `map_flag` values are different for each map

### Current Map Shows Wrong Value
- Check that `map_select_entity` exists and has a valid state
- Verify map names in configuration match the select entity options exactly
- Check browser console for any error messages

### Map Switching Doesn't Work  
- Check Home Assistant logs for vacuum command errors
- Verify your robot supports the `load_multi_map` command
- Ensure the vacuum entity has the correct permissions

## Expected Command Format

When you select a map, the card sends this command to your vacuum:
```yaml
service: vacuum.send_command
data:
  entity_id: vacuum.robby
  command: load_multi_map
  params:
    map_flag: <selected_map_flag>
```

Where `<selected_map_flag>` is:
- `0` for EG
- `1` for OG  
- `2` for Schlafzimmer