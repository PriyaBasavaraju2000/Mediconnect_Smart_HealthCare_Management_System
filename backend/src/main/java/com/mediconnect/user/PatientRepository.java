package com.mediconnect.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {
    Optional<Patient> findByUserId(Long userId);
    Optional<Patient> findByUserEmail(String email);

    @Query("SELECT p FROM Patient p JOIN p.user u WHERE u.name LIKE %:name%")
    List<Patient> searchByName(String name);
}
