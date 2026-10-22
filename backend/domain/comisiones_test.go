package domain_test

import (
	"testing"

	"multicatalogo-backend/domain"
)

func TestRepartirComisiones(t *testing.T) {
	total := 100.0

	comisiones := domain.RepartirComisiones(total, domain.TasasMLM)

	if len(comisiones) != 3 {
		t.Fatalf("expected 3 comisiones, got %d", len(comisiones))
	}

	esperados := map[int]float64{
		1: 10.0,
		2: 5.0,
		3: 2.0,
	}

	var suma float64
	for nivel, esperado := range esperados {
		rep, ok := comisiones[nivel]
		if !ok {
			t.Fatalf("comision nivel %d no encontrada", nivel)
		}
		if rep.Monto != esperado {
			t.Errorf("nivel %d: expected %.2f, got %.2f", nivel, esperado, rep.Monto)
		}
		suma += rep.Monto
	}

	if suma > total {
		t.Errorf("suma de comisiones (%.2f) excede el total de venta (%.2f)", suma, total)
	}
}

func TestRepartirComisionesVentaCero(t *testing.T) {
	comisiones := domain.RepartirComisiones(0.0, domain.TasasMLM)

	if len(comisiones) != 0 {
		t.Errorf("con venta cero se esperaba mapa vacio, se obtuvieron %d elementos", len(comisiones))
	}
}
