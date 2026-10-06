package com.quiz;
import jakarta.persistence.*;
import java.util.*;
@Entity
public class Question {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
  @Column(name = "q_text", length = 1000) public String text;
  @ElementCollection(fetch = FetchType.EAGER) @OrderColumn(name = "pos") @Column(length = 500)
  public List<String> options = new ArrayList<>();
  public int correct;
  public int marks = 1;
}
