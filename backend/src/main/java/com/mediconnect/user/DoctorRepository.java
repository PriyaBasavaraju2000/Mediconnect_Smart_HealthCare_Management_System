package com.mediconnect.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    Optional<Doctor> findByUserId(Long userId);
    List<Doctor> findBySpecializationIgnoreCase(String specialization);
    List<Doctor> findByAvailableTrue();
    boolean existsByLicenseNumber(String licenseNumber);
}
