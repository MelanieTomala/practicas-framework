package domain

// TasasMLM estándar por nivel (10%, 5%, 2%)
var TasasMLM = map[int]float64{
	1: 0.10,
	2: 0.05,
	3: 0.02,
}

// RepartoComision representa el cálculo puro para un nivel dado
type RepartoComision struct {
	Nivel      int     `json:"nivel"`
	Porcentaje float64 `json:"porcentaje"`
	Monto      float64 `json:"monto"`
}

// RepartirComisiones calcula las comisiones puramente a partir del total y las tasas
func RepartirComisiones(total float64, tasas map[int]float64) map[int]RepartoComision {
	repartos := make(map[int]RepartoComision)
	if total <= 0 {
		return repartos
	}

	for nivel, tasa := range tasas {
		monto := total * tasa
		repartos[nivel] = RepartoComision{
			Nivel:      nivel,
			Porcentaje: tasa * 100,
			Monto:      monto,
		}
	}
	return repartos
}
