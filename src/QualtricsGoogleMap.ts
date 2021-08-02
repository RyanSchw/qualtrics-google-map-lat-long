declare const Qualtrics: any;

interface Map {
  css?: string;
  options: google.maps.MapOptions;
  marker: {
    autocomplete?: {
      enabled: boolean;
      label: string;
      css?: string;
      labelCss?: string;
      invalidLocationAlertText: string;
    },
    options: google.maps.MarkerOptions;
  };
}

interface Question {
  id: string;
  container: Element;
  map: Map;
}

const initGoogleMapsQuestion = (
  id: Question['id'],
  container: Question['container'],
  map: Question['map'],
): void | Error => {
  // Find the dataBox and hide it
  const dataBox = document.getElementById(`QR~${id}`) as HTMLInputElement | null;
  if (!dataBox) {
    return new Error(`Could not find input for question with id ${id}.`);
  }
  dataBox.style.display = 'none';

  // Find the QuestionBody to append to
  const questionBody = container.querySelector('.QuestionBody') || container;

  // Initialize data storage or load from existing data in field
  const value: { [key: number]: google.maps.LatLng } = dataBox.value !== '' ? JSON.parse(dataBox.value) : {};

  // Function to set the dataBox to a lat/lng
  const setLatLng = (key: number, latLng: google.maps.LatLng) => {
    value[key] = latLng;
    dataBox.value = JSON.stringify(value);
  };

  const styles = document.createElement('style');
  document.head.appendChild(styles);

  // Create the map node
  const mapObject = document.createElement('div');
  mapObject.setAttribute('id', `${id}-map`);
  if (map.css) {
    styles.innerText += `#${id}-map {${map.css}}`;
    mapObject.setAttribute('style', map.css);
  } else {
    styles.innerText += `#${id}-map {height: 300px;}`;
  }
  questionBody.appendChild(mapObject);

  // Initialize the Google Map
  const googleMap = new google.maps.Map(mapObject, map.options);

  // Initialize the Marker
  const mapMarker = new google.maps.Marker({
    ...map.marker.options,
    map: googleMap,
    position: map.options.center,
  });

  if (map.marker.autocomplete?.enabled) {
    const inputId = `${id}-locationInput`;

    // Make the label for the autocomplete
    const locationLabel = document.createElement('label');
    locationLabel.setAttribute('for', inputId);
    locationLabel.setAttribute('id', `${inputId}-label`);
    locationLabel.setAttribute('class', 'QuestionText');
    if (map.marker.autocomplete.labelCss) {
      styles.innerText += `#${inputId}-label {${map.marker.autocomplete.labelCss}}`;
    }
    locationLabel.innerText = map.marker.autocomplete.label || map.marker.options.title || `Marker ${map.marker.options.label}`;
    questionBody.appendChild(locationLabel);

    // Make the autocomplete
    const locationInput = document.createElement('input');
    locationInput.setAttribute('id', inputId);
    locationInput.setAttribute('class', 'InputText');
    if (map.marker.autocomplete.css) {
      styles.innerText += `#${id}-locationInput {${map.marker.autocomplete.css}}`;
    }
    questionBody.appendChild(locationInput);

    // Load the places API
    const locationAutocomplete = new google.maps.places.Autocomplete(locationInput);

    // Whenever the inputs change, set the locationLatLong and pan the map to the location
    google.maps.event.addListener(locationAutocomplete, 'place_changed', () => {
      const place = locationAutocomplete.getPlace();

      if (place.geometry) {
        mapMarker.setPosition(place.geometry.location);
        googleMap.panTo(place.geometry.location);
        Qualtrics.SurveyEngine.setEmbeddedData('PRICE', 'testfrom ts');
      } else {
        alert(map.marker.autocomplete?.invalidLocationAlertText || 'Invalid Location');
      }
    });
  }
};

// Typescript doesn't allow augmentation of the global scope except in modules, but we need to expose this to the global scope
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.initGoogleMapsQuestion = initGoogleMapsQuestion;
