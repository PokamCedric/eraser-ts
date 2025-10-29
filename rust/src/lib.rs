use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::collections::{HashMap, HashSet};

#[napi(object)]
pub struct DirectedRelation {
    pub left: String,
    pub right: String,
}

/// LayerClassifier - Algorithme de classification par Floyd-Warshall inversé
///
/// Cette classe implémente UNIQUEMENT la phase 2 (processing) de l'algorithme:
/// - Calcul des distances transitives avec Floyd-Warshall MAX
/// - Placement des entités par rapport à une entité de référence
/// - Normalisation des positions
///
/// Les phases 1 (pré-processing) et 3 (post-processing) sont gérées en externe.
#[napi]
pub struct LayerClassifier {
    relations: Vec<DirectedRelation>,
    entities: HashSet<String>,
    distances: HashMap<String, i32>,
}

#[napi]
impl LayerClassifier {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            relations: Vec::new(),
            entities: HashSet::new(),
            distances: HashMap::new(),
        }
    }

    /// Ajoute une relation A r B (A doit être à gauche de B)
    #[napi]
    pub fn add_relation(&mut self, left: String, right: String) {
        self.relations.push(DirectedRelation {
            left: left.clone(),
            right: right.clone(),
        });
        self.entities.insert(left.clone());
        self.entities.insert(right.clone());

        // Distance initiale = 1 (relation atomique)
        self.distances.insert(Self::make_key(&left, &right), 1);

        // Recalculer toutes les distances avec les intercalations
        self.update_distances();
    }

    /// Met à jour les distances en détectant les intercalations transitives (Théorème de Thalès)
    ///
    /// Utilise Floyd-Warshall modifié pour calculer la distance MAXIMALE entre toutes paires.
    /// La distance maximale représente le nombre d'intercalations dans le chemin le plus long.
    ///
    /// Optimisation: Pruning précoce - arrêt global si aucune distance ne change pendant
    /// une passe complète sur tous les nœuds intermédiaires.
    ///
    /// Complexité:
    /// - Pire cas: O(n³) où n = nombre d'entités
    /// - Meilleur cas: O(n² × k) où k = nombre d'itérations avant convergence
    fn update_distances(&mut self) {
        let max_iterations = self.entities.len();
        let mut iteration = 0;

        while iteration < max_iterations {
            iteration += 1;
            let mut changed_in_pass = false;

            // Floyd-Warshall: pour chaque nœud intermédiaire k
            let entities_vec: Vec<String> = self.entities.iter().cloned().collect();

            for k in &entities_vec {
                for i in &entities_vec {
                    for j in &entities_vec {
                        if i != j && i != k && j != k {
                            // Si on a un chemin i -> k et k -> j
                            let key_ik = Self::make_key(i, k);
                            let key_kj = Self::make_key(k, j);
                            let key_ij = Self::make_key(i, j);

                            if let (Some(&dist_ik), Some(&dist_kj)) =
                                (self.distances.get(&key_ik), self.distances.get(&key_kj)) {
                                // Distance via k (principe d'atomicité)
                                let dist_via_k = dist_ik + dist_kj;

                                // Mettre à jour la distance i -> j si on trouve un chemin plus long (MAX)
                                match self.distances.get(&key_ij) {
                                    Some(&current_dist) => {
                                        if dist_via_k > current_dist {
                                            // Principe de maximalité: le chemin long l'emporte
                                            self.distances.insert(key_ij, dist_via_k);
                                            changed_in_pass = true;
                                        }
                                    }
                                    None => {
                                        // Créer une nouvelle distance transitive (Thalès inversé)
                                        self.distances.insert(key_ij, dist_via_k);
                                        changed_in_pass = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Pruning précoce: si aucune distance n'a changé pendant toute cette passe,
            // l'algorithme a convergé - on peut arrêter
            if !changed_in_pass {
                break;
            }
        }
    }

    /// Compte le nombre de connexions pour chaque entité
    fn count_connections(&self) -> HashMap<String, usize> {
        let mut connections = HashMap::new();

        for entity in &self.entities {
            let mut count = 0;
            for rel in &self.relations {
                if &rel.left == entity || &rel.right == entity {
                    count += 1;
                }
            }
            connections.insert(entity.clone(), count);
        }

        connections
    }

    /// Calcule les layers en utilisant l'entité la plus connectée comme référence
    ///
    /// Processus:
    /// 1. Sélectionner l'entité de référence (avec cascade criteria)
    /// 2. Placer la référence au layer 0
    /// 3. Propager les positions en respectant les distances
    /// 4. Normaliser pour que le minimum soit au layer 0
    /// 5. Grouper par layer
    #[napi]
    pub fn compute_layers(&self) -> Vec<Vec<String>> {
        if self.entities.is_empty() {
            return Vec::new();
        }

        let connections = self.count_connections();

        // Cascade de critères pour choisir la référence
        let get_reference_score = |entity: &String| -> (usize, usize) {
            let direct_connections = *connections.get(entity).unwrap_or(&0);

            let mut neighbors_connections_sum = 0;
            for rel in &self.relations {
                if &rel.left == entity {
                    neighbors_connections_sum += connections.get(&rel.right).unwrap_or(&0);
                } else if &rel.right == entity {
                    neighbors_connections_sum += connections.get(&rel.left).unwrap_or(&0);
                }
            }

            (direct_connections, neighbors_connections_sum)
        };

        // Trouver l'entité de référence
        let mut reference_entity = String::new();
        let mut best_score = (0, 0);

        for entity in &self.entities {
            let score = get_reference_score(entity);
            if score.0 > best_score.0 || (score.0 == best_score.0 && score.1 > best_score.1) {
                best_score = score;
                reference_entity = entity.clone();
            }
        }

        println!(
            "\n[DEBUG] Entite de reference: {} ({} connexions, somme voisins: {})",
            reference_entity, best_score.0, best_score.1
        );

        // Placer l'entité de référence au layer 0
        let mut layers = HashMap::new();
        layers.insert(reference_entity.clone(), 0);

        // Itérer jusqu'à ce que toutes les entités soient placées
        let max_iterations = self.entities.len().pow(2);
        let mut iteration = 0;

        while layers.len() < self.entities.len() && iteration < max_iterations {
            iteration += 1;
            let mut progress = false;

            for (key, &distance) in &self.distances {
                let (left, right) = Self::parse_key(key);

                if layers.contains_key(&left) && !layers.contains_key(&right) {
                    // Placer right pour la première fois
                    layers.insert(right.clone(), layers[&left] + distance);
                    progress = true;
                } else if layers.contains_key(&right) && !layers.contains_key(&left) {
                    // Placer left pour la première fois
                    layers.insert(left.clone(), layers[&right] - distance);
                    progress = true;
                } else if layers.contains_key(&left) && layers.contains_key(&right) {
                    // Les deux sont déjà placés - vérifier la cohérence
                    let expected_right = layers[&left] + distance;

                    if layers[&right] < expected_right {
                        layers.insert(right.clone(), expected_right);
                        progress = true;
                    }
                }
            }

            if !progress {
                // Placer les entités restantes au layer 0
                for entity in &self.entities {
                    if !layers.contains_key(entity) {
                        layers.insert(entity.clone(), 0);
                        progress = true;
                    }
                }
            }
        }

        // Afficher résumé des distances
        println!("\n[DEBUG] DISTANCES PAR RAPPORT A {}", reference_entity.to_uppercase());
        let mut by_distance: HashMap<i32, Vec<String>> = HashMap::new();

        for (entity, &layer) in &layers {
            if entity != &reference_entity {
                by_distance.entry(layer).or_insert_with(Vec::new).push(entity.clone());
            }
        }

        let mut sorted_distances: Vec<i32> = by_distance.keys().cloned().collect();
        sorted_distances.sort();

        for dist in sorted_distances {
            let direction = if dist < 0 {
                "GAUCHE"
            } else if dist > 0 {
                "DROITE"
            } else {
                "MEME LAYER"
            };
            println!("[DEBUG] Distance {:+} ({}):", dist, direction);

            let mut entities = by_distance[&dist].clone();
            entities.sort();
            for entity in entities {
                println!("[DEBUG]   - {}", entity);
            }
        }

        // Normaliser (décaler pour que le minimum soit 0)
        let min_layer = *layers.values().min().unwrap_or(&0);
        if min_layer < 0 {
            for (_, layer) in layers.iter_mut() {
                *layer -= min_layer;
            }
            println!("\n[DEBUG] Normalisation: decalage de {}", -min_layer);
            println!("[DEBUG] {} est maintenant au layer {}", reference_entity, layers[&reference_entity]);
        }

        // Grouper par layer
        let mut layer_dict: HashMap<i32, Vec<String>> = HashMap::new();
        for (entity, &layer) in &layers {
            layer_dict.entry(layer).or_insert_with(Vec::new).push(entity.clone());
        }

        // Convertir en array trié par index de layer
        let mut sorted_layer_indices: Vec<i32> = layer_dict.keys().cloned().collect();
        sorted_layer_indices.sort();

        let mut sorted_layers = Vec::new();
        for idx in sorted_layer_indices {
            let mut layer = layer_dict[&idx].clone();
            layer.sort();
            sorted_layers.push(layer);
        }

        sorted_layers
    }

    /// Getter pour les statistiques
    #[napi]
    pub fn get_stats(&self) -> serde_json::Value {
        serde_json::json!({
            "entities": self.entities.len(),
            "relations": self.relations.len(),
            "distances": self.distances.len(),
        })
    }

    /// Helper: créer une clé unique pour une paire (left, right)
    fn make_key(left: &str, right: &str) -> String {
        format!("{}→{}", left, right)
    }

    /// Helper: parser une clé pour récupérer (left, right)
    fn parse_key(key: &str) -> (String, String) {
        let parts: Vec<&str> = key.split('→').collect();
        (parts[0].to_string(), parts[1].to_string())
    }
}
