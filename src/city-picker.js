import { searchCities } from "./cities.js";

export function createCityPicker(input, list, { onChange, onSelect }) {
  let activeCityIndex = -1;
  let visibleCities = [];

  function close() {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    activeCityIndex = -1;
  }

  function render() {
    visibleCities = searchCities(input.value);
    list.replaceChildren();
    visibleCities.forEach((city, index) => {
      const option = document.createElement("li");
      option.id = `city-option-${index}`;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(index === activeCityIndex));
      option.textContent = city.name;
      list.append(option);
    });
    list.hidden = visibleCities.length === 0;
    input.setAttribute("aria-expanded", String(!list.hidden));
    if (activeCityIndex >= 0 && visibleCities[activeCityIndex]) {
      input.setAttribute("aria-activedescendant", `city-option-${activeCityIndex}`);
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function select(city) {
    input.value = city.name;
    close();
    onSelect(city);
  }

  input.addEventListener("focus", render);
  input.addEventListener("input", () => {
    activeCityIndex = -1;
    onChange();
    render();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
    } else if (event.key === "ArrowDown" && !list.hidden) {
      event.preventDefault();
      activeCityIndex = (activeCityIndex + 1) % visibleCities.length;
      render();
    } else if (event.key === "ArrowUp" && !list.hidden) {
      event.preventDefault();
      activeCityIndex = activeCityIndex < 0
        ? visibleCities.length - 1
        : (activeCityIndex - 1 + visibleCities.length) % visibleCities.length;
      render();
    } else if (event.key === "Enter" && !list.hidden && visibleCities.length) {
      event.preventDefault();
      select(visibleCities[Math.max(activeCityIndex, 0)]);
    }
  });
  list.addEventListener("pointerdown", (event) => event.preventDefault());
  list.addEventListener("click", (event) => {
    const option = event.target.closest('[role="option"]');
    if (option) select(visibleCities[Number(option.id.replace("city-option-", ""))]);
  });

  return {
    close,
    clear() {
      input.value = "";
      close();
    },
    setValue(value) {
      input.value = value;
      close();
    }
  };
}